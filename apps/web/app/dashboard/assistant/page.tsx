import { Suspense } from "react";
import { AssistantChat } from "@/components/dashboard/assistant-chat";

function AssistantFallback() {
  return (
    <div className="px-5 py-10 md:px-8">
      <p className="text-sm text-slate-500">Loading assistant...</p>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<AssistantFallback />}>
      <AssistantChat />
    </Suspense>
  );
}
