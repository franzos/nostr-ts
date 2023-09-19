import { NEVENT_KIND } from "@nostr-ts/common";

/**
 * - Required fields are marked with `required: true`
 * - Optional fields are marked with `required: false`
 * - Fields the user should input are marked with `userInput: true`
 */
export const NoteSpec = [
  {
    name: "NewShortTextNote",
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
    spec: [
      {
        content: {
          required: true,
          kind: "Root",
          userInput: true,
        },
        tags: [
          {
            required: false,
            kind: "SubjectTag",
            userInput: true,
          },
        ],
      },
    ],
  },
  {
    name: "NewRecommendRelay",
    kind: NEVENT_KIND.RECOMMEND_RELAY,
    spec: [
      {
        content: {
          required: true,
          kind: "Root",
          userInput: true,
          help: "Enter the URL of the relay you want to recommend",
        },
        tags: [
          {
            required: false,
            kind: "NonceTag",
            userInput: true,
          },
        ],
      },
    ],
  },
  {
    name: "NewReaction",
    kind: NEVENT_KIND.REACTION,
    spec: [
      {
        content: {
          required: true,
          kind: "Root",
          userInput: true,
          help: "+ / -",
        },
      },
    ],
  },
  {
    name: "NewLongFormContent",
    kind: NEVENT_KIND.LONG_FORM_CONTENT,
    spec: [
      {
        content: {
          required: true,
          kind: "Root",
          userInput: true,
        },
        tags: [
          {
            required: false,
            kind: "EventTag",
            userInput: true,
          },
        ],
      },
    ],
  },
  {
    name: "NewShortTextNoteResponse",
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
    spec: [
      {
        content: {
          required: true,
          kind: "Root",
          userInput: true,
        },
        tags: [
          {
            required: false,
            kind: "SubjectTag",
            userInput: false,
          },
          {
            required: true,
            kind: "EventTag",
            userInput: false,
          },
          {
            required: true,
            kind: "PublicKeyTag",
            userInput: false,
          },
        ],
      },
    ],
  },
];
