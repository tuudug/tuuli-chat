"use client";

import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_MODEL_ID,
  GeminiModelId,
  Message,
  MODEL_DETAILS,
} from "@/lib/types"; // Use new model types/constants
import { Message as AIMessage, type Attachment } from "ai"; // Added CoreMessage
import { useChat } from "ai/react";
import { useRouter, useSearchParams } from "next/navigation"; // Import useSearchParams
import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"; // Added useRef
import { v4 as uuidv4 } from "uuid"; // For generating client-side IDs
import ChatHeader from "./ChatHeader";
import ChatInputArea from "./ChatInputArea";
import MessageDisplayArea from "./MessageDisplayArea";

interface ChatInterfaceProps {
  chatId: string;
}

export default function ChatInterface({ chatId }: ChatInterfaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams(); // For reading query params
  const supabase = createClient();

  // Derived state for stable useEffect dependency
  const isNewChatFlowFromParams = searchParams.get("newChat") === "true";
  const processedNewChatIdRef = useRef<string | null>(null); // Ref to track processed new chat

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const [selectedModel, setSelectedModel] =
    useState<GeminiModelId>(DEFAULT_MODEL_ID); // Use new default
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const [initialMessagesFetched, setInitialMessagesFetched] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(false);
  const [initialMessagesError, setInitialMessagesError] = useState<
    string | null
  >(null);
  const [isAwaitingFirstToken, setIsAwaitingFirstToken] = useState(false); // Renamed state
  const [responseError, setResponseError] = useState<string | null>(null);
  const [messageIdToProcessTokens, setMessageIdToProcessTokens] = useState<
    string | null
  >(null);
  const [dynamicContainerStyle, setDynamicContainerStyle] = useState({});
  const [uiReadyForNewChatSetup, setUiReadyForNewChatSetup] = useState(false); // Added state for new chat UI readiness

  const fetchInitialData = useCallback(async () => {
    if (chatId === "new" || !chatId) {
      setChatTitle("New Conversation");
      setInitialMessagesFetched(true);
      setInitialFetchLoading(false);
      setInitialMessagesError(null);
      return {
        initialMessages: [],
        fetchedModel: DEFAULT_MODEL_ID, // Use new default
      };
    }

    setInitialFetchLoading(true);
    setInitialMessagesError(null);
    setChatTitle(null);

    try {
      const { data: chatData, error: titleError } = await supabase
        .from("chats")
        .select("title")
        .eq("id", chatId)
        .single();

      const fetchedTitle = chatData?.title || "Chat";
      setChatTitle(fetchedTitle);
      if (titleError) console.error("Error fetching chat title:", titleError);

      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (messageError) {
        console.error("Error fetching messages:", messageError);
        setInitialMessagesError(
          `Error loading messages: ${messageError.message}`
        );
        return {
          initialMessages: [],
          fetchedModel: DEFAULT_MODEL_ID, // Use new default
        };
      }

      const fetchedMessages: Message[] = messageData || [];

      let fetchedModel = DEFAULT_MODEL_ID; // Use new default
      const firstAssistantMessage = fetchedMessages.find(
        (msg) => msg.role === "assistant" && msg.model_used
      );
      // Check if the fetched model_used is a valid GeminiModelId
      const isValidModel = MODEL_DETAILS.some(
        (detail) => detail.id === firstAssistantMessage?.model_used
      );
      if (firstAssistantMessage?.model_used && isValidModel) {
        fetchedModel = firstAssistantMessage.model_used as GeminiModelId;
      }

      return { initialMessages: fetchedMessages, fetchedModel };
    } catch (error) {
      setInitialMessagesError(
        `Error loading chat data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setChatTitle("Error Loading Chat");
      return {
        initialMessages: [],
        fetchedModel: DEFAULT_MODEL_ID, // Use new default
      };
    } finally {
      setInitialFetchLoading(false);
      setInitialMessagesFetched(true);
    }
  }, [chatId, supabase]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit, // Renamed to avoid conflict
    error: _chatError,
    setMessages,
    append, // We will use append now
    data,
    isLoading, // from useChat, can be used for isWaitingForResponse
  } = useChat({
    api: "/api/chat",
    id: chatId !== "new" ? chatId : undefined, // This will be set to client-generated UID for new chats
    initialMessages: [],
    onResponse: (response) => {
      if (!response.ok) {
        console.error("Streaming API response error:", response.statusText);
        setResponseError(`Error: ${response.status} ${response.statusText}`);
      }
      setIsAwaitingFirstToken(false); // Use renamed setter
    },
    onFinish: (finishedMessage) => {
      if (finishedMessage.role === "assistant") {
        setMessageIdToProcessTokens(finishedMessage.id);
      }
      // isLoading from useChat will become false automatically by the SDK
    },
    onError: (err) => {
      console.error("useChat hook error:", err);
      setResponseError(err.message || "An error occurred during streaming.");
      // isLoading from useChat will become false automatically
    },
  });

  // Effect to process token usage when a message finishes
  useEffect(() => {
    if (messageIdToProcessTokens && data) {
      interface TokenUsageUpdateData {
        type: "token_usage_update";
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      }
      let tokenDataForCurrentMessage:
        | {
            promptTokens?: number;
            completionTokens?: number;
            totalTokens?: number;
          }
        | undefined = undefined;

      const foundDataObject = [...data]
        .reverse()
        .find((item: AIMessage["data"]) => {
          if (
            typeof item === "object" &&
            item !== null &&
            !Array.isArray(item)
          ) {
            return (item as { type?: string }).type === "token_usage_update";
          }
          return false;
        });

      if (foundDataObject) {
        const tokenUpdate = foundDataObject as unknown as TokenUsageUpdateData;
        tokenDataForCurrentMessage = {
          promptTokens: tokenUpdate.promptTokens,
          completionTokens: tokenUpdate.completionTokens,
          totalTokens: tokenUpdate.totalTokens,
        };
      }

      if (tokenDataForCurrentMessage) {
        setMessages((currentMessages) => {
          const typedMessages = currentMessages as unknown as (AIMessage & {
            model_used?: string;
            created_at?: string;
          })[];
          return typedMessages.map((msg) => {
            if (
              msg.id === messageIdToProcessTokens &&
              msg.role === "assistant"
            ) {
              const existingMsgData =
                typeof msg.data === "object" &&
                msg.data !== null &&
                !Array.isArray(msg.data)
                  ? msg.data
                  : {};
              const updatedMsgData = {
                ...existingMsgData,
                ...tokenDataForCurrentMessage,
              };
              return {
                ...msg,
                model_used: selectedModel,
                created_at:
                  msg.createdAt?.toISOString() || new Date().toISOString(),
                data: updatedMsgData,
              };
            }
            return {
              ...msg,
              created_at:
                msg.createdAt?.toISOString() || new Date().toISOString(),
            };
          }) as unknown as AIMessage[];
        });
      }
      setMessageIdToProcessTokens(null); // Reset after processing
    }
  }, [messageIdToProcessTokens, data, setMessages, selectedModel]);

  // Effect for fetching initial data for existing chats
  useEffect(() => {
    if (chatId && chatId !== "new" && !initialMessagesFetched) {
      const isNewChatFlow = searchParams.get("newChat") === "true";
      if (!isNewChatFlow) {
        // Only fetch if not part of the new chat flow already handled
        fetchInitialData().then(({ initialMessages, fetchedModel }) => {
          setMessages(initialMessages as unknown as AIMessage[]);
          setSelectedModel(fetchedModel);
        });
      }
    } else if (chatId === "new") {
      // Reset state for /chat/new route before client-side navigation
      setMessages([]);
      setChatTitle("New Conversation");
      setSelectedModel(DEFAULT_MODEL_ID);
      setInitialMessagesFetched(false); // Allow fetch if navigated away and back
      setInitialFetchLoading(false);
      setInitialMessagesError(null);
      setResponseError(null);
    }
  }, [
    chatId,
    initialMessagesFetched,
    fetchInitialData,
    setMessages,
    searchParams,
  ]);

  // Effect for handling the newChat=true flow
  useEffect(() => {
    // Use the derived isNewChatFlowFromParams
    if (isNewChatFlowFromParams && chatId && chatId !== "new") {
      if (processedNewChatIdRef.current === chatId) {
        console.log(
          `[ChatInterface newChatEffect] Already processed new chat flow for chatId: ${chatId}. Skipping.`
        );
        return;
      }

      console.log(
        `[ChatInterface newChatEffect] Running for chatId: ${chatId}, newChat=true`
      );
      const storageKey = `chat_init_${chatId}`;
      console.log(
        `[ChatInterface newChatEffect] Attempting to get item from sessionStorage with key: ${storageKey}`
      );
      const storedDataString = sessionStorage.getItem(storageKey);
      console.log(
        `[ChatInterface newChatEffect] sessionStorage.getItem result:`,
        storedDataString
      );

      if (storedDataString) {
        try {
          const storedData = JSON.parse(storedDataString) as {
            message: string;
            model: GeminiModelId;
            attachmentInfo?: {
              url: string;
              name: string;
              type: string;
              base64Content?: string;
            };
          };

          setChatTitle("New Conversation"); // Or generate from message
          setSelectedModel(storedData.model);

          const userMessageForDisplay: AIMessage = {
            id: uuidv4(), // local unique ID for display
            role: "user",
            content: storedData.message,
            createdAt: new Date(),
            // @ts-expect-error // Add custom attachment property for local display
            attachment: storedData.attachmentInfo?.base64Content
              ? {
                  name: storedData.attachmentInfo.name,
                  type: storedData.attachmentInfo.type,
                  content: storedData.attachmentInfo.base64Content, // For immediate display
                }
              : undefined,
          };
          // setMessages([userMessageForDisplay]); // REMOVED: Let append handle adding the user message
          console.log(
            "[ChatInterface newChatEffect] User message prepared for display (but not setting directly):",
            userMessageForDisplay
          );
          setInitialMessagesFetched(true); // Mark as fetched to prevent refetch

          // Prepare data for `append`
          const messageToAppend: { role: "user"; content: string } = {
            // Ensure content is string for append
            role: "user",
            content: storedData.message, // storedData.message is already a string
          };

          let attachmentsForSdk: Attachment[] | undefined = undefined;
          if (
            storedData.attachmentInfo?.url &&
            (storedData.attachmentInfo.type.startsWith("image/") ||
              storedData.attachmentInfo.type.startsWith("text/"))
          ) {
            attachmentsForSdk = [
              {
                name: storedData.attachmentInfo.name,
                contentType: storedData.attachmentInfo.type,
                url: storedData.attachmentInfo.url,
              },
            ];
          }

          interface NewChatApiData {
            // Removed index signature as 'as any' is used
            chatId: string;
            modelId: GeminiModelId;
            attachment_url?: string;
            attachment_name?: string;
            attachment_type?: string;
          }

          const dataForApi: NewChatApiData = {
            chatId: chatId, // This is the client-generated UID
            modelId: storedData.model,
            ...(storedData.attachmentInfo?.url && {
              attachment_url: storedData.attachmentInfo.url,
              attachment_name: storedData.attachmentInfo.name,
              attachment_type: storedData.attachmentInfo.type,
            }),
          };

          setIsAwaitingFirstToken(true); // Manually set waiting state before append
          append(messageToAppend, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: dataForApi as any,
            experimental_attachments: attachmentsForSdk,
          });

          sessionStorage.removeItem(`chat_init_${chatId}`);
          setUiReadyForNewChatSetup(true); // Signal that UI can now be shown with correct model

          // Clean up URL query param
          const newPath = `/chat/${chatId}`;
          router.replace(newPath, { scroll: false }); // Use replace to avoid back button issues
          processedNewChatIdRef.current = chatId; // Mark as processed
        } catch (parseError) {
          console.error(
            `[ChatInterface newChatEffect] Error parsing sessionStorage data for key ${storageKey}:`,
            parseError,
            "Raw data:",
            storedDataString
          );
          setResponseError(
            "Failed to initialize new chat: corrupted session data."
          );
          sessionStorage.removeItem(storageKey); // Clean up corrupted item
          processedNewChatIdRef.current = chatId; // Mark as processed even on parse error to prevent loops
          setUiReadyForNewChatSetup(true); // Allow error to be shown
          // router.replace("/chat/new", { scroll: false }); // Fallback - commented out
        }
      } else {
        console.error(
          // Changed from warn to error for more visibility
          `[ChatInterface newChatEffect] CRITICAL: newChat=true but NO data found in sessionStorage for key: ${storageKey}. ChatId: ${chatId}`
        );
        setResponseError(
          "Critical error: Could not retrieve initial chat data from session. This might be due to browser settings (e.g., 'Block all cookies' can affect sessionStorage) or a bug. Please try starting the new chat again."
        );
        setUiReadyForNewChatSetup(true); // Allow error to be shown
        processedNewChatIdRef.current = chatId; // Mark as processed to prevent loops
        // router.replace("/chat/new", { scroll: false }); // Fallback - commented out
      }
    }
  }, [
    chatId,
    isNewChatFlowFromParams, // Use derived boolean
    router,
    setMessages,
    append,
    setSelectedModel,
    supabase,
    // isNewChatFlowFromParams is already used, searchParams itself is not needed if isNewChatFlowFromParams is stable
  ]);

  // This effect handles the old redirection logic from useChat's `data` object.
  // It might conflict or be redundant with the new flow.
  // Consider removing or adjusting if `data` from `useChat` is still used for redirection.
  // For now, let's keep it but be aware.
  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      const latestStreamDataPayload = data[data.length - 1] as {
        chatId?: string;
      };
      // This condition `chatId === "new"` will likely not be met if we navigate away from /chat/new immediately.
      if (latestStreamDataPayload?.chatId && chatId === "new") {
        // This redirection should ideally be handled by the new flow's client-side navigation.
        // router.push(`/chat/${latestStreamDataPayload.chatId}`);
        console.warn(
          "Old redirection logic triggered for chatId=new, this might be unexpected."
        );
      }
    }
  }, [data, chatId, router]);

  const handleNewChatSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    attachmentFile?: File | null
  ) => {
    e.preventDefault();
    if (isAwaitingFirstToken || isLoading) return; // Prevent multiple submissions, check isLoading too

    const currentInputVal = input;
    if (!currentInputVal.trim() && !attachmentFile) {
      return;
    }
    setIsAwaitingFirstToken(true); // Set waiting state early

    const newClientChatId = uuidv4();
    console.log(
      `[ChatInterface handleNewChatSubmit] Generated newClientChatId: ${newClientChatId}`
    );

    // 1. Generate a preliminary title
    const preliminaryTitle =
      currentInputVal.substring(0, 50) || "New Conversation";

    try {
      // 2. Call the new /api/chat/create endpoint
      const createChatShellResponse = await fetch("/api/chat/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientChatId: newClientChatId,
          title: preliminaryTitle,
        }),
      });

      if (!createChatShellResponse.ok) {
        const errorData = await createChatShellResponse.json();
        throw new Error(errorData.error || "Failed to create chat shell.");
      }
      console.log(
        `[ChatInterface handleNewChatSubmit] Chat shell created successfully for ${newClientChatId}`
      );

      // 3. Proceed with attachment handling (if any) and sessionStorage
      let attachmentInfo:
        | { url: string; name: string; type: string; base64Content?: string }
        | undefined = undefined;

      if (attachmentFile) {
        console.log(
          `[ChatInterface handleNewChatSubmit] Processing attachment: ${attachmentFile.name}`
        );
        // Attachment processing logic remains largely the same
        const base64String = await fileToBase64(attachmentFile);
        const uploadResponse = await fetch("/api/upload-attachment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileContent: base64String,
            fileName: attachmentFile.name,
            fileType: attachmentFile.type,
            chatId: newClientChatId,
          }),
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(
            errorData.error || "File upload failed during new chat init"
          );
        }
        const uploadedAttachment = await uploadResponse.json();
        attachmentInfo = {
          url: uploadedAttachment.publicUrl,
          name: uploadedAttachment.name,
          type: uploadedAttachment.type,
          base64Content: base64String,
        };
      }

      const dataToStore = {
        message: currentInputVal,
        model: selectedModel,
        attachmentInfo: attachmentInfo,
        // Optionally store the preliminaryTitle if ChatHeader needs it immediately on the new page
        // title: preliminaryTitle,
      };
      console.log(
        `[ChatInterface handleNewChatSubmit] Data to store in sessionStorage for key chat_init_${newClientChatId}:`,
        dataToStore
      );

      const storageKey = `chat_init_${newClientChatId}`;
      sessionStorage.setItem(storageKey, JSON.stringify(dataToStore));
      console.log(
        `[ChatInterface handleNewChatSubmit] Successfully setItem in sessionStorage for key: ${storageKey}`
      );

      handleInputChange({
        target: { value: "" },
      } as ChangeEvent<HTMLTextAreaElement>);
      router.push(`/chat/${newClientChatId}?newChat=true`);
    } catch (error) {
      console.error(
        "[ChatInterface handleNewChatSubmit] Error during new chat creation flow:",
        error
      );
      setResponseError(
        error instanceof Error ? error.message : "Failed to initiate new chat."
      );
      setIsAwaitingFirstToken(false); // Reset on error
    }
    // setIsAwaitingFirstToken will be reset by the new page load or if an error occurs before navigation
  };

  const handleExistingChatSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    attachmentFile?: File | null
  ) => {
    // This is the original handleSubmit logic, now for existing chats
    e.preventDefault();
    if (isLoading || isAwaitingFirstToken) return; // Use isLoading from useChat & renamed state

    setResponseError(null);
    setIsAwaitingFirstToken(true); // Still useful for immediate UI feedback

    const currentInputVal = input;
    if (!currentInputVal.trim() && !attachmentFile) {
      setIsAwaitingFirstToken(false);
      return;
    }

    let attachmentsForSdk: Attachment[] | undefined = undefined;
    let attachmentMetadataForBackend:
      | {
          attachment_url: string;
          attachment_name: string;
          attachment_type: string;
        }
      | undefined = undefined;
    // For existing chats, local preview data is added by useChat hook if we pass it in `append` or `handleSubmit`
    // We need to ensure the user's message with attachment preview is added to `messages` state correctly.
    // The `useChat` hook's `append` or `handleSubmit` should handle adding the user message with its attachments to the `messages` array.

    if (attachmentFile) {
      try {
        const base64String = await fileToBase64(attachmentFile); // For upload
        // Upload to get public URL
        const uploadResponse = await fetch("/api/upload-attachment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileContent: base64String,
            fileName: attachmentFile.name,
            fileType: attachmentFile.type,
            chatId: chatId, // Existing chatId
          }),
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(
            errorData.error || "File upload failed for existing chat"
          );
        }
        const uploadedAttachment = await uploadResponse.json();

        if (
          attachmentFile.type.startsWith("image/") ||
          attachmentFile.type.startsWith("text/")
        ) {
          attachmentsForSdk = [
            {
              name: uploadedAttachment.name,
              contentType: uploadedAttachment.type,
              url: uploadedAttachment.publicUrl,
            },
          ];
        }
        attachmentMetadataForBackend = {
          attachment_url: uploadedAttachment.publicUrl,
          attachment_name: uploadedAttachment.name,
          attachment_type: uploadedAttachment.type,
        };
      } catch (error) {
        console.error(
          "Error processing or uploading attachment for existing chat:",
          error
        );
        setResponseError(
          error instanceof Error
            ? error.message
            : "Failed to process attachment."
        );
        setIsAwaitingFirstToken(false);
        return;
      }
    }

    // Define a more specific type for the data payload
    interface ExistingChatApiData {
      // Removed index signature as 'as any' is used
      modelId: GeminiModelId;
      chatId: string;
      attachment_url?: string;
      attachment_name?: string;
      attachment_type?: string;
    }

    const dataForApi: ExistingChatApiData = {
      modelId: selectedModel,
      chatId: chatId, // Existing chatId
      ...attachmentMetadataForBackend,
    };

    // The userMessageToAppend is implicitly handled by originalHandleSubmit when it takes `e` (the form event)
    // which allows it to read `input` from its own closure from `useChat`.
    // We just need to pass the event and the options.

    // Manually add user message with attachment preview for immediate display
    // The `useChat` hook should ideally handle this if `append` is used correctly.
    // Let's rely on `originalHandleSubmit` to correctly form the user message with attachments.
    // Or, if using `append`, we'd do:
    // const displayMessage: AIMessage = {
    //   id: uuidv4(),
    //   role: 'user',
    //   content: currentInputVal,
    //   createdAt: new Date(),
    //   ...(attachmentFile && localAttachmentPreviewDataForDisplay && {
    //     // @ts-ignore
    //     attachment: localAttachmentPreviewDataForDisplay
    //   })
    // };
    // setMessages(prev => [...prev, displayMessage]);
    // append({ role: 'user', content: currentInputVal }, { experimental_attachments: attachmentsForSdk, data: dataForApi });

    // Using originalHandleSubmit from useChat
    originalHandleSubmit(e, {
      // Pass the original event
      experimental_attachments: attachmentsForSdk,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: dataForApi as any,
    });
  };

  // Determine which submit handler to use
  const activeFormSubmitHandler =
    chatId === "new" ? handleNewChatSubmit : handleExistingChatSubmit;

  const handleExampleQuestionClick = (question: string) => {
    handleInputChange({
      target: { value: question },
    } as ChangeEvent<HTMLTextAreaElement>);
    // Optionally, auto-focus the input area after clicking an example
    // document.querySelector('textarea[placeholder="Type your message here..."]')?.focus();
  };

  // Effect for handling visual viewport changes on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        setDynamicContainerStyle({
          height: `${window.visualViewport.height}px`,
        });
      } else {
        // Fallback for environments where visualViewport is not available
        // This might mean no dynamic adjustment, or you could try window.innerHeight
        // but window.innerHeight doesn't account for the on-screen keyboard.
        // For now, only adjust if visualViewport is present.
      }
    };

    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      handleResize(); // Initial call
      return () => {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", handleResize);
        }
      };
    }
    // No cleanup needed if visualViewport wasn't available or listener not added
    return () => {};
  }, []);

  // Determine if the full UI should be shown or a loader for new chat setup
  const showFullUI =
    !isNewChatFlowFromParams || // If not in new chat flow, always show
    (isNewChatFlowFromParams && uiReadyForNewChatSetup); // If in new chat flow, wait for setup

  const handleTitleUpdate = (newTitle: string) => {
    setChatTitle(newTitle);
  };

  return (
    <div className="flex flex-col h-full" style={dynamicContainerStyle}>
      <ChatHeader
        title={chatTitle}
        chatId={chatId}
        onTitleUpdate={handleTitleUpdate}
        onChatDeleted={() => {
          // Trigger a manual refresh of the chat list
          // We can emit a custom event or use a callback mechanism
          window.dispatchEvent(
            new CustomEvent("chatDeleted", { detail: { chatId } })
          );
        }}
      />

      {showFullUI ? (
        <>
          <MessageDisplayArea
            messages={messages as unknown as Message[]}
            chatId={chatId}
            initialFetchLoading={
              initialFetchLoading || (isLoading && messages.length === 0)
            } // Combine loading states
            initialMessagesError={initialMessagesError}
            isAwaitingFirstToken={isAwaitingFirstToken} // Pass renamed state
            isOverallLoading={isLoading || isAwaitingFirstToken} // Pass combined state for general loading
            responseError={responseError || _chatError?.message || null}
            onExampleQuestionClick={handleExampleQuestionClick}
            selectedModel={selectedModel}
          />

          <ChatInputArea
            input={input}
            handleInputChange={handleInputChange}
            handleFormSubmit={activeFormSubmitHandler} // Use the active handler
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            isWaitingForResponse={isLoading || isAwaitingFirstToken} // Keep combined state for disabling input
          />
        </>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
          {responseError ? (
            <div className="text-red-500 bg-red-100 p-4 rounded-md">
              <h3 className="font-semibold text-lg mb-2">
                Initialization Error
              </h3>
              <p>{responseError}</p>
              <button
                onClick={() => router.push("/chat/new")}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div>Setting up new chat...</div>
          )}
        </div>
      )}
    </div>
  );
}
