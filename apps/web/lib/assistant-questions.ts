export const ASSISTANT_SUGGESTED_QUESTIONS = [
  "How many annual leaves do employees receive?",
  "Summarize our company policies.",
  "What information is available in our company documents?",
] as const;

export const DASHBOARD_SUGGESTIONS = [
  {
    title: "Leave policy",
    question: ASSISTANT_SUGGESTED_QUESTIONS[0],
  },
  {
    title: "Company policies",
    question: ASSISTANT_SUGGESTED_QUESTIONS[1],
  },
  {
    title: "Document knowledge",
    question: ASSISTANT_SUGGESTED_QUESTIONS[2],
  },
] as const;
