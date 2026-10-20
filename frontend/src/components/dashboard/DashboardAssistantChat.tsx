import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Brain,
  Clipboard,
  Expand,
  Loader2,
  MessageCircle,
  Minimize2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";

type DashboardKind = "government" | "farmer";

type AssistantOutput = {
  answer: string;
  highlights: string[];
  limitations: string[];
  citations: string[];
  recommendedWording?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  output?: AssistantOutput;
  kind?: "answer" | "needs_state" | "error";
};

type DashboardAssistantChatProps = {
  dashboard: DashboardKind;
  commodity?: string;
  className?: string;
};

const SUGGESTED_PROMPTS: Record<DashboardKind, string[]> = {
  government: [
    "What changed in food security today?",
    "Which data source is weakest right now?",
    "Can I say diesel prices caused rice prices to rise?",
  ],
  farmer: [
    "What should I watch this week?",
    "Explain input cost pressure in plain language.",
    "Can I say chicken prices are caused by diesel?",
  ],
};

const EMPTY_OUTPUT: AssistantOutput = {
  answer: "",
  highlights: [],
  limitations: [],
  citations: [],
};

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function DashboardAssistantChat({
  dashboard,
  commodity,
  className,
}: DashboardAssistantChatProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<string | undefined>();
  const [district, setDistrict] = useState<string | undefined>();
  const [pendingQuestion, setPendingQuestion] = useState<string | undefined>();
  const viewportRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.assistant.chat.useMutation();
  const isLoading = chatMutation.isPending;

  const title = dashboard === "government" ? "Policy Assistant" : "Farm Assistant";
  const description =
    dashboard === "government"
      ? "Ask about risk, prices, evidence, and data gaps."
      : "Ask about prices, input pressure, and local watch points.";

  const suggestedPrompts = useMemo(() => SUGGESTED_PROMPTS[dashboard], [dashboard]);

  useEffect(() => {
    const viewport = viewportRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement | null;

    if (!viewport) return;
    requestAnimationFrame(() => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    });
  }, [messages, isLoading, open, expanded]);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmed,
    };
    const history = [...messages, userMessage]
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-20)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    setMessages((current) => [...current, userMessage]);
    setInput("");

    try {
      const response = await chatMutation.mutateAsync({
        dashboard,
        message: trimmed,
        history,
        state,
        district,
        commodity,
        pendingQuestion,
      });

      if (response.state) setState(response.state);
      if (response.district) setDistrict(response.district);
      setPendingQuestion(response.kind === "needs_state" ? response.pendingQuestion : undefined);

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: response.output.answer,
          output: response.output,
          kind: response.kind,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The assistant could not process that request.";
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: "The assistant could not process that request.",
          kind: "error",
          output: {
            ...EMPTY_OUTPUT,
            answer: "The assistant could not process that request.",
            limitations: [message],
          },
        },
      ]);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        size="icon-lg"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 z-50 h-14 w-14 border border-emerald-200 bg-emerald-600 text-white shadow-[0_18px_40px_rgba(15,118,110,0.28)] hover:bg-emerald-700 md:bottom-6 md:right-6",
          className
        )}
        aria-label={`Open ${title}`}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <section
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.2)]",
        expanded
          ? "inset-x-3 bottom-20 top-16 md:inset-x-10 md:bottom-8 md:top-20 xl:inset-x-20"
          : "bottom-20 right-3 h-[36rem] max-h-[calc(100vh-6rem)] w-[calc(100vw-1.5rem)] max-w-[26rem] md:bottom-6 md:right-6",
        className
      )}
      aria-label={title}
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-[#F8FAF9] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Brain className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-emerald-950">{title}</h2>
              <p className="truncate text-xs text-slate-500">{description}</p>
            </div>
          </div>
          {(state || district) && (
            <p className="mt-2 text-xs font-semibold text-emerald-700">
              Local context: {[district, state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? "Shrink assistant" : "Enlarge assistant"}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div ref={viewportRef} className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-4">
            {messages.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Ask what the dashboard means.
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      I use the FoodMonitor Genkit flows and return citations when the data supports them.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      disabled={isLoading}
                      className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left text-xs font-semibold leading-5 text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Brain className="h-4 w-4" />
                </span>
                <div className="rounded-lg border border-slate-200 bg-[#F8FAF9] px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingQuestion ? "Tell me your Malaysian state..." : "Ask about this dashboard..."}
            className="max-h-28 min-h-10 flex-1 resize-none rounded-lg"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </section>
  );
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[84%] rounded-lg bg-emerald-600 px-3 py-2 text-sm leading-6 text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
        <Brain className="h-4 w-4" />
      </span>
      <div className="min-w-0 max-w-[88%] space-y-3">
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm leading-6",
            message.kind === "error"
              ? "border-red-200 bg-red-50 text-red-950"
              : message.kind === "needs_state"
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-slate-200 bg-[#F8FAF9] text-slate-800"
          )}
        >
          <div className="prose prose-sm max-w-none prose-p:leading-6 prose-a:text-emerald-700">
            <Streamdown>{message.output?.answer ?? message.content}</Streamdown>
          </div>
        </div>

        {message.output && <AssistantStructuredOutput output={message.output} />}
      </div>
    </div>
  );
}

function AssistantStructuredOutput({ output }: { output: AssistantOutput }) {
  const hasDetails =
    output.highlights.length > 0 ||
    output.limitations.length > 0 ||
    output.citations.length > 0 ||
    Boolean(output.recommendedWording);

  if (!hasDetails) return null;

  return (
    <div className="space-y-2">
      {output.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {output.highlights.map((highlight) => (
            <span
              key={highlight}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold leading-5 text-emerald-800"
            >
              {highlight}
            </span>
          ))}
        </div>
      )}

      {output.limitations.length > 0 && (
        <div className="space-y-1">
          {output.limitations.map((limitation) => (
            <div
              key={limitation}
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
              <span>{limitation}</span>
            </div>
          ))}
        </div>
      )}

      {output.recommendedWording && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Report wording
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void navigator.clipboard?.writeText(output.recommendedWording ?? "")}
              className="h-7 px-2 text-xs"
            >
              <Clipboard className="h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
          <p className="text-sm leading-6 text-slate-700">{output.recommendedWording}</p>
        </div>
      )}

      {output.citations.length > 0 && (
        <details className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Sources
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {output.citations.map((citation) => (
              <span
                key={citation}
                className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600"
              >
                {citation}
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
