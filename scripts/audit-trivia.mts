import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

import { catalogueIdentity } from "../src/data/catalogueSchema";
import { triviaCategories, triviaPackSchema } from "../src/data/triviaSchema";

const pack = triviaPackSchema.parse(
  JSON.parse(await readFile(process.argv[2] ?? "src/data/trivia/bundled.json", "utf8")),
);
const original = triviaPackSchema.parse(
  JSON.parse(await readFile("content/trivia/original-pack-v2.json", "utf8")),
);
const earlierAdditions = (
  await Promise.all(
    ["history-arts", "science-places", "screen-music-sport"].map(async (batch) =>
      JSON.parse(await readFile(`content/trivia/${batch}.json`, "utf8")),
    ),
  )
).flat();
const previousQuestions = triviaPackSchema.parse({
  ...original,
  questions: [...original.questions, ...earlierAdditions],
}).questions;
for (const question of previousQuestions) {
  if (
    !isDeepStrictEqual(
      question,
      pack.questions.find((entry) => entry.id === question.id),
    )
  )
    throw new Error(`Prior record changed or missing: ${question.id}`);
}
for (const question of pack.questions) {
  for (const value of [question.question, question.answer, ...question.acceptableAnswers]) {
    if (/\s{2,}|[\r\n\t]/u.test(value)) throw new Error(`Unclean whitespace: ${question.id}`);
  }
  if (!question.question.endsWith("?")) throw new Error(`Missing question mark: ${question.id}`);
}

const stop = new Set(
  "a an the which what who where when how is are was were in on of to for by with and its it has have do does did name called from at as many".split(
    " ",
  ),
);
const tokens = (value: string) =>
  new Set(
    value
      .toLocaleLowerCase("en-AU")
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((word) => !stop.has(word)),
  );
const reviewPairs: { first: string; second: string; reason: string }[] = [];
for (let left = 0; left < pack.questions.length; left++) {
  const first = pack.questions[left]!;
  const firstAnswers = new Set([first.answer, ...first.acceptableAnswers].map(catalogueIdentity));
  const firstTokens = tokens(first.question);
  for (const second of pack.questions.slice(left + 1)) {
    const secondTokens = tokens(second.question);
    const intersection = [...firstTokens].filter((token) => secondTokens.has(token)).length;
    const similarity = intersection / new Set([...firstTokens, ...secondTokens]).size;
    const answerOverlap = [second.answer, ...second.acceptableAnswers].some((answer) =>
      firstAnswers.has(catalogueIdentity(answer)),
    );
    if (answerOverlap || (intersection >= 3 && similarity >= 0.45)) {
      reviewPairs.push({
        first: first.id,
        second: second.id,
        reason: answerOverlap
          ? "Shared answer/alias: inspect underlying fact"
          : "Similar wording: inspect underlying fact",
      });
    }
  }
}
console.log(
  JSON.stringify(
    {
      version: pack.version,
      total: pack.questions.length,
      originalPreserved: original.questions.length,
      previousPreserved: previousQuestions.length,
      kids: pack.questions.filter((question) => question.kidAppropriate).length,
      categories: triviaCategories.map((category) => ({
        category,
        ...Object.fromEntries(
          ["easy", "medium", "hard"].map((difficulty) => [
            difficulty,
            pack.questions.filter(
              (question) => question.category === category && question.difficulty === difficulty,
            ).length,
          ]),
        ),
        kids: pack.questions.filter(
          (question) => question.category === category && question.kidAppropriate,
        ).length,
      })),
      reviewPairs,
      note: "Flags require editorial review; a shared answer is not necessarily a duplicate. No flags is not proof of semantic uniqueness or factual accuracy.",
    },
    null,
    2,
  ),
);
