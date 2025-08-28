import { useTranslate } from "@probo/i18n";
import {
  Breadcrumb,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Spinner,
  useDialogRef,
  useToast,
} from "@probo/ui";
import "@toast-ui/editor/dist/theme/toastui-editor-dark.css";
import "@toast-ui/editor/dist/toastui-editor.css";
import { type RefObject } from "react";
import { Controller } from "react-hook-form";
import { useMutation } from "react-relay";
import { graphql } from "relay-runtime";
import { z } from "zod";
import type { DocumentDetailPageDocumentFragment$data } from "../__generated__/DocumentDetailPageDocumentFragment.graphql";
import type { UpdateVersionDialogCreateMutation } from "./__generated__/UpdateVersionDialogCreateMutation.graphql";
import type { UpdateVersionDialogUpdateMutation } from "./__generated__/UpdateVersionDialogUpdateMutation.graphql";
import DocumentEditor from "/components/documents/DocumentEditor";
import { useFormWithSchema } from "/hooks/useFormWithSchema";
import { useMutationWithToasts } from "/hooks/useMutationWithToasts";

const createDraftDocument = graphql`
  mutation UpdateVersionDialogCreateMutation(
    $input: CreateDraftDocumentVersionInput!
    $connections: [ID!]!
  ) {
    createDraftDocumentVersion(input: $input) {
      documentVersionEdge @prependEdge(connections: $connections) {
        node {
          id
          content
          status
          publishedAt
          version
          updatedAt
          signatures(first: 100) {
            edges {
              node {
                id
                state
              }
            }
          }
        }
      }
    }
  }
`;

const UpdateDocumentMutation = graphql`
  mutation UpdateVersionDialogUpdateMutation(
    $input: UpdateDocumentVersionInput!
  ) {
    updateDocumentVersion(input: $input) {
      documentVersion {
        id
        content
      }
    }
  }
`;

type Props = {
  document: DocumentDetailPageDocumentFragment$data;
  connectionId: string;
  ref: RefObject<{ open: () => void } | null>;
};

const versionSchema = z.object({
  content: z.string(),
});

export default function UpdateVersionDialog({
  document,
  connectionId,
  ref,
}: Props) {
  const { __ } = useTranslate();
  const { toast } = useToast();
  const dialogRef = useDialogRef();

  const version = document.versions.edges[0].node;
  const isDraft = version?.status === "DRAFT";
  const [createDraftDocumentVersion, isCreatingDraft] =
    useMutation<UpdateVersionDialogCreateMutation>(createDraftDocument);
  const [updateDocumentVersion, isUpdating] =
    useMutationWithToasts<UpdateVersionDialogUpdateMutation>(
      UpdateDocumentMutation,
      {
        successMessage: __("Document updated successfully."),
        errorMessage: __("Failed to update document. Please try again."),
      }
    );
  const { handleSubmit, control } = useFormWithSchema(versionSchema, {
    defaultValues: {
      content: version.content,
    },
  });

  ref.current = {
    open: () => {
      dialogRef.current?.open();
    },
  };

  if (!version) {
    return;
  }

  const onSubmit = handleSubmit((data) => {
    if (isDraft) {
      updateDocumentVersion({
        variables: {
          input: {
            documentVersionId: version.id,
            content: data.content,
          },
        },
        onSuccess: () => {
          dialogRef.current?.close();
        },
      });
    } else {
      createDraftDocumentVersion({
        variables: {
          input: {
            documentID: document.id,
          },
          connections: [connectionId],
        },
        onCompleted: (createResponse, errors) => {
          if (errors) {
            toast({
              variant: "error",
              title: __("Error creating draft"),
              description:
                errors[0]?.message || __("An unknown error occurred"),
            });
            return;
          }

          const newVersionId =
            createResponse?.createDraftDocumentVersion?.documentVersionEdge
              ?.node?.id;
          if (newVersionId && data.content !== version.content) {
            updateDocumentVersion({
              variables: {
                input: {
                  documentVersionId: newVersionId,
                  content: data.content,
                },
              },
              onSuccess: () => {
                dialogRef.current?.close();
              },
            });
          } else {
            dialogRef.current?.close();
          }
        },
      });
    }
  });

  const isLoading = isCreatingDraft || isUpdating;

  return (
    <Dialog
      ref={dialogRef}
      title={<Breadcrumb items={[__("Documents"), __("Edit document")]} />}
    >
      <form onSubmit={onSubmit}>
        <DialogContent>
          <Controller
            control={control}
            name="content"
            render={({ field }) => (
              <DocumentEditor
                inputValue={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </DialogContent>
        <DialogFooter>
          <Button disabled={isLoading} type="submit">
            {isLoading && <Spinner />}
            {__("Update document")}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
