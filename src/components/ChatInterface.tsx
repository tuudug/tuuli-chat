"use client";

import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_MODEL_ID,
  GeminiModelId,
  Message,
  MODEL_DETAILS,
} from "@/lib/types"; // Use new model types/constants
import { useRouter, useSearchParams } from "next/navigation"; // Import useSearchParams
import { useSparks } from "@/contexts/SparksContext";
import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
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
  const [dynamicContainerStyle, setDynamicContainerStyle] = useState({});
  const [uiReadyForNewChatSetup, setUiReadyForNewChatSetup] = useState(false); // Added state for new chat UI readiness

  const { sparksBalance, setSparksBalance } = useSparks();

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
      // Find the *last* assistant message to get the most recently used model
      const lastAssistantMessage = [...fetchedMessages]
        .reverse()
        .find((msg) => msg.role === "assistant" && msg.model_used);

      // Check if the fetched model_used is a valid GeminiModelId
      const isValidModel = MODEL_DETAILS.some(
        (detail) => detail.id === lastAssistantMessage?.model_used
      );
      if (lastAssistantMessage?.model_used && isValidModel) {
        fetchedModel = lastAssistantMessage.model_used as GeminiModelId;
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>
  ) => {
    setInput(e.target.value);
  };

  // Effect for fetching initial data for existing chats
  useEffect(() => {
    if (chatId && chatId !== "new" && !initialMessagesFetched) {
      const isNewChatFlow = searchParams.get("newChat") === "true";
      if (!isNewChatFlow) {
        // Only fetch if not part of the new chat flow already handled
        fetchInitialData().then(({ initialMessages, fetchedModel }) => {
          setMessages(initialMessages);
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

          const userMessage: Message = {
            id: uuidv4(),
            role: "user",
            content: storedData.message,
            created_at: new Date().toISOString(),
            attachment_name: storedData.attachmentInfo?.name,
            attachment_type: storedData.attachmentInfo?.type,
            attachment_preview: storedData.attachmentInfo?.base64Content,
          };

          const initialMessages: Message[] = [userMessage];
          setMessages(initialMessages);
          setInitialMessagesFetched(true);
          setUiReadyForNewChatSetup(true);

          // Immediately trigger the API call
          setIsAwaitingFirstToken(true);
          setIsLoading(true);

          fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: initialMessages,
              data: {
                modelId: storedData.model,
                chatId: chatId,
                attachment_url: storedData.attachmentInfo?.url,
                attachment_content: storedData.attachmentInfo?.base64Content,
                attachment_name: storedData.attachmentInfo?.name,
                attachment_type: storedData.attachmentInfo?.type,
              },
            }),
          })
            .then(async (response) => {
              if (!response.body) throw new Error("No response body");

              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let assistantResponse = "";
              const assistantMessageId = uuidv4();

              setMessages((prev) => [
                ...prev,
                {
                  id: assistantMessageId,
                  role: "assistant",
                  content: "",
                  created_at: new Date().toISOString(),
                  model_used: storedData.model, // Add model to placeholder
                },
              ]);

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const rawChunk = decoder.decode(value);
                const metadataSentinel = "\n\n[METADATA]";
                if (rawChunk.includes(metadataSentinel)) {
                  const [contentPart, metadataPart] =
                    rawChunk.split(metadataSentinel);
                  assistantResponse += contentPart;
                  try {
                    const metadata = JSON.parse(metadataPart);
                    if (metadata.type === "metadata") {
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === assistantMessageId
                            ? {
                                ...msg,
                                id: metadata.data.messageId,
                                sparks_cost: metadata.data.sparksCost,
                                content: assistantResponse,
                              }
                            : msg
                        )
                      );
                      if (typeof metadata.data.newBalance === "number") {
                        setSparksBalance(metadata.data.newBalance);
                      }
                    }
                  } catch (e) {
                    console.error("Failed to parse metadata JSON:", e);
                  }
                } else {
                  assistantResponse += rawChunk;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: assistantResponse }
                        : msg
                    )
                  );
                }
              }
            })
            .catch((err) => {
              setError(err as Error);
              setResponseError(
                err instanceof Error ? err.message : "An unknown error occurred"
              );
            })
            .finally(() => {
              setIsLoading(false);
              setIsAwaitingFirstToken(false);
              sessionStorage.removeItem(`chat_init_${chatId}`);
              const newPath = `/chat/${chatId}`;
              router.replace(newPath, { scroll: false });
              processedNewChatIdRef.current = chatId;
            });
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
    setSelectedModel,
    supabase,
    // isNewChatFlowFromParams is already used, searchParams itself is not needed if isNewChatFlowFromParams is stable
  ]);

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
    e.preventDefault();
    if (isLoading || isAwaitingFirstToken) return;

    const currentInputVal = input;
    if (!currentInputVal.trim() && !attachmentFile) {
      return;
    }

    setResponseError(null);
    setIsAwaitingFirstToken(true);
    setIsLoading(true);

    let attachmentDataForBackend:
      | {
          attachment_url: string;
          attachment_content: string;
          attachment_name: string;
          attachment_type: string;
        }
      | undefined = undefined;

    let localAttachmentPreview:
      | {
          name: string;
          type: string;
          content: string; // base64
        }
      | undefined = undefined;

    if (attachmentFile) {
      try {
        const base64String = await fileToBase64(attachmentFile);

        // For local preview
        localAttachmentPreview = {
          name: attachmentFile.name,
          type: attachmentFile.type,
          content: base64String,
        };

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

        attachmentDataForBackend = {
          attachment_url: uploadedAttachment.publicUrl,
          attachment_content: base64String,
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
        setIsLoading(false);
        return;
      }
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: currentInputVal,
      created_at: new Date().toISOString(),
      attachment_name: localAttachmentPreview?.name,
      attachment_type: localAttachmentPreview?.type,
      // This is a custom property for local preview and needs to be handled in MessageDisplayArea
      attachment_preview: localAttachmentPreview?.content,
    };

    const newMessages: Message[] = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          data: {
            modelId: selectedModel,
            chatId: chatId,
            ...attachmentDataForBackend,
          },
        }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = "";
      const assistantMessageId = uuidv4();

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
          model_used: selectedModel, // Add model to placeholder
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const rawChunk = decoder.decode(value);

        // Check for our metadata sentinel value
        const metadataSentinel = "\n\n[METADATA]";
        if (rawChunk.includes(metadataSentinel)) {
          const [contentPart, metadataPart] = rawChunk.split(metadataSentinel);
          assistantResponse += contentPart;

          try {
            const metadata = JSON.parse(metadataPart);
            if (metadata.type === "metadata") {
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        id: metadata.data.messageId, // Update with the real ID from DB
                        sparks_cost: metadata.data.sparksCost,
                        content: assistantResponse, // Final content update
                      }
                    : msg
                )
              );
              // Update the sparks balance in the context
              if (typeof metadata.data.newBalance === "number") {
                setSparksBalance(metadata.data.newBalance);
              }
            }
          } catch (e) {
            console.error("Failed to parse metadata JSON:", e);
          }
        } else {
          assistantResponse += rawChunk;
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: assistantResponse }
                : msg
            )
          );
        }
      }
    } catch (error) {
      setError(error as Error);
    } finally {
      setIsLoading(false);
      setIsAwaitingFirstToken(false); // Reset loading state
    }
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
            responseError={responseError || error?.message || null}
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
            messages={messages.map((msg) => ({ content: msg.content }))} // Pass message content for sparks calculation
            userSparks={sparksBalance || 0} // Pass user sparks balance from context
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
