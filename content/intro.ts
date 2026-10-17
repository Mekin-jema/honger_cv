// Sentence pools for the typed hero. The first pass types line 0 of every pool - a short, real intro.
// After that, parts are swapped one at a time following `introSchedule`, each pool stepping through its
// own lines in order. Every line is a complete sentence. `^n` pauses typing for n ms.
// Keep lines short: the heading is sized so the longest possible combination fits in 4 lines.
export type IntroPool = { id: string; lines: string[]; /** false = starts empty and joins later. */ firstPass?: boolean };

export const introPools: IntroPool[] = [
  { id: "hello", lines: ["Hi, I'm Mekin Jemal.", "Hello, I'm Mekin.", "Hey there, I'm Mekin."] },
  {
    id: "role",
    lines: [
      "I'm a Software Engineer.",
      "I build full-stack products.",
      "I work across AI, data and DevOps.",
      "I build analytics and automation systems.",
      "I design practical software for real problems.",
      "I love combining code, data and hardware.",
    ],
  },
  {
    id: "experience",
    lines: [
      "I work at the intersection of software, AI and analytics.",
      "I bring experience in telecom data, GIS and IoT.",
      "I build systems that are useful, measurable and scalable.",
      "I enjoy turning complex problems into practical solutions.",
    ],
  },
  {
    id: "belief",
    firstPass: false,
    lines: [
      "I believe good software should solve real problems.",
      "I believe data makes decisions clearer.",
      "I value clean design and thoughtful execution.",
      "I keep learning and keep building.",
      "I enjoy work that connects engineering with impact.",
      "Ask me anything.",
    ],
  },
];

/** Which part changes next, in a loop. The greeting changes rarely. */
export const introSchedule = ["belief", "role", "experience", "belief", "role", "experience", "belief", "role", "hello", "belief", "role", "experience"];

export const staticIntro = "Hi, I'm Mekin Jemal. I'm a software engineer working across full-stack, AI, data and DevOps.";

/** The longest sentence the typing loop can ever show, used to size the heading. */
export const longestIntro = introPools
  .map((p) => p.lines.map((l) => l.replace(/\^\d+/g, "")).reduce((a, b) => (b.length > a.length ? b : a), ""))
  .join(" ");

/** Things I believe - listed in the "What I believe" answer. */
export const beliefs: string[] = [
  "I believe good software solves real problems.",
  "I believe data makes decisions clearer.",
  "I believe engineering should be practical and maintainable.",
  "I keep learning by building systems that have real impact.",
  "I value thoughtful execution over flashy shortcuts.",
  "I believe technology is most useful when it creates clarity and value.",
];
