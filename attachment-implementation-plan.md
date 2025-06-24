# Attachment Functionality Implementation Plan

This document outlines the plan for implementing file attachment functionality in the chat interface. The chosen approach uses `fileData` for a more robust and user-friendly experience.

## 1. Frontend Modifications (`ChatInterface.tsx` & `ChatInputArea.tsx`)

The user interface will be updated to handle the upload process asynchronously and provide clear feedback to the user.

- **Immediate Upload on File Selection**: When a user selects a file, the upload process to the `/api/upload-attachment` endpoint will begin immediately.
- **New UI States**:
  - A new state, `isUploading`, will be added to track the file upload status.
  - While `isUploading` is `true`, the "Send" button will be disabled, and a loading indicator will appear next to the selected file's name to show that the upload is in progress.
- **Store Uploaded File Info**: Once the upload is complete, the `publicUrl`, `name`, and `mimeType` returned from the API will be stored in a state variable (e.g., `uploadedFileInfo`).
- **Send URL on Submit**: When the user clicks "Send", the `handleSubmit` function will now send the stored `uploadedFileInfo` (containing the URL and MIME type) to the `/api/chat` endpoint.

## 2. Backend Modifications (`/api/chat/route.ts`)

The backend logic will be adapted to work with the file URL instead of raw file data.

- **Receive Attachment URL**: The API will be updated to extract the `attachment_url` and `attachment_type` from the request body.
- **Construct `fileData` Part**: The code will find the last user message and append a `Part` object to it, structured exactly as the Google AI SDK documentation specifies for the `fileData` approach:
  ```javascript
  {
    fileData: {
      fileUri: "THE_PUBLIC_URL_FROM_SUPABASE",
      mimeType: "THE_FILE_MIME_TYPE"
    }
  }
  ```

## 3. Data Flow Diagram

This diagram illustrates the new, improved workflow:

```mermaid
sequenceDiagram
    participant Client as ChatInterface.tsx
    participant UploadAPI as /api/upload-attachment
    participant ChatAPI as /api/chat
    participant Supabase
    participant GoogleAI as Google AI SDK

    Client->>Client: User selects file
    Client->>+UploadAPI: POST /api/upload-attachment (file)
    Client->>Client: Show "Uploading..." state, disable Send button

    UploadAPI->>+Supabase: Upload file to Storage
    Supabase-->>-UploadAPI: Public URL
    UploadAPI-->>-Client: { publicUrl, name, type }
    Client->>Client: Store publicUrl, re-enable Send button

    Client->>Client: User clicks Send
    Client->>+ChatAPI: POST /api/chat (messages, attachmentUrl, attachmentType)

    ChatAPI->>GoogleAI: generateContentStream({ contents: [..., { role: 'user', parts: [{text: '...'}, {fileData: {fileUri: '...', mimeType: '...'}}] }] })
    GoogleAI-->>-ChatAPI: Stream of response chunks
    ChatAPI->>+Supabase: Save user message with attachmentUrl
    Supabase-->>-ChatAPI: User message saved
    ChatAPI-->>Client: Stream of response chunks
    Client->>Client: Update UI with streaming response

    ChatAPI->>+Supabase: Save assistant message
    Supabase-->>-ChatAPI: Assistant message saved
    ChatAPI->>+Supabase: Call log_and_spend_sparks_for_assistant_message()
    Supabase-->>-ChatAPI: { success, sparks_spent, new_balance }
    ChatAPI-->>Client: [METADATA]{ messageId, sparksCost, newBalance }
    Client->>Client: Update UI with final cost and new balance
```
