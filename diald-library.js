/* DIALD Intervention Library — SAMPLE CONTENT.
   Written as placeholders to show the structure. Darlin will replace them
   with her own pathways and activities. Strategy credits name the original authors. */
(function (root) {
  'use strict';

  const CATEGORIES = {
    oral: { name: 'Oral language', combo: 'Listening + Speaking' },
    literacy: { name: 'Literacy', combo: 'Reading + Writing' },
    production: { name: 'Production', combo: 'Speaking + Writing' },
    comprehension: { name: 'Comprehension', combo: 'Listening + Reading' },
    assets: { name: 'Linguistic assets', combo: 'Home language as a resource' }
  };

  const GRADES = ['K-2', '3-5', '6-8', '9-12'];

  const activities = [
    {
      id: 'think-aloud-annotation', name: 'Think-Aloud Annotation', category: 'comprehension',
      domains: ['listening', 'reading'], grades: ['3-5', '6-8', '9-12'], minutes: 20,
      studentsWill: ['Listen as the teacher thinks aloud about a short text', 'Mark the text with symbols for main idea, question, and new word', 'Explain to a partner why they marked each place'],
      steps: ['Choose a short paragraph (100–200 words) from the class text.', 'Read it aloud and say your thinking: "This part is important because…".', 'Students annotate the next paragraph with the same 3 symbols.', 'Partners compare marks and must justify one choice they disagree on.'],
      frames: ['I marked this as the main idea because…', 'I have a question here: why…?', 'I disagree with your mark because the text says…'],
      adaptations: {
        1: 'Use a picture-supported text. Students point to and mark only one symbol (★ important). Accept answers in the home language.',
        2: 'Use two symbols. Give a word bank with the key words from the text. Students explain with a frame.',
        3: 'Use all three symbols. Students write one short note in the margin for each mark.',
        4: 'Students choose their own symbols and explain the author’s purpose for one paragraph.'
      },
      check: 'Collect one annotated paragraph. Count how many marks have a correct, text-based reason.',
      materials: 'Short text copy, symbol key card', credit: 'Think-aloud modeling (Davey, 1983)', status: 'sample'
    },
    {
      id: 'reciprocal-teaching', name: 'Reciprocal Teaching Roles', category: 'comprehension',
      domains: ['reading', 'speaking', 'listening'], grades: ['3-5', '6-8', '9-12'], minutes: 25,
      studentsWill: ['Read a text in small groups', 'Take a role: Predictor, Questioner, Clarifier, or Summarizer', 'Lead the group in their role and rotate'],
      steps: ['Model all four roles with one paragraph.', 'Give each student a role card with frames.', 'Groups read one section at a time; each role leads for 1–2 minutes.', 'Rotate roles for the next section.'],
      frames: ['I predict ___ because the text says ___.', 'A question I have is ___. I think the answer is ___ because ___.', 'The word ___ was confusing. I think it means ___ because ___.', 'The most important idea is ___. I chose it because ___.'],
      adaptations: {
        1: 'Use only the Predictor role with pictures. The teacher reads aloud. Students point and answer with one word or the home language.',
        2: 'Use two roles (Predictor and Clarifier) with full sentence frames and a word bank.',
        3: 'Use all four roles with frames. Students write their summary in 1–2 sentences.',
        4: 'Students lead without frames and must connect their summary to the text’s bigger question.'
      },
      check: 'Listen to one group for 3 minutes. Note which roles each student can lead without help.',
      materials: 'Role cards, sectioned text', credit: 'Reciprocal teaching (Palincsar & Brown, 1984)', status: 'sample'
    },
    {
      id: 'evidence-sort', name: 'Evidence Sort and Defend', category: 'literacy',
      domains: ['reading', 'writing'], grades: ['3-5', '6-8', '9-12'], minutes: 20,
      studentsWill: ['Read a claim and six pieces of evidence', 'Sort evidence as strong, weak, or not related', 'Write why their strongest piece supports the claim'],
      steps: ['Write one clear claim about the class text.', 'Prepare six evidence cards: two strong, two weak, two not related.', 'Partners sort the cards and must agree before moving a card.', 'Each student writes one sentence defending the strongest card.'],
      frames: ['This evidence is strong because it shows…', 'This evidence is weak because it does not explain…', 'This is not related because the claim is about…, but this is about…'],
      adaptations: {
        1: 'Use three cards with pictures. Students sort into "yes" and "no" and say one word to explain.',
        2: 'Use four cards. Students sort and complete one frame orally, then copy it.',
        3: 'Use six cards. Students write a defense sentence with "because".',
        4: 'Students write a short evidence card of their own that is stronger than the ones given, and explain why.'
      },
      check: 'Collect the defense sentence. Does it explain HOW the evidence supports the claim, not just repeat it?',
      materials: 'Evidence cards (printed or digital)', credit: 'DIALD sample activity', status: 'sample'
    },
    {
      id: 'claim-evidence-explain', name: 'Claim–Evidence–Explain Paragraph', category: 'production',
      domains: ['writing', 'speaking'], grades: ['3-5', '6-8', '9-12'], minutes: 30,
      studentsWill: ['State a claim about a text', 'Choose evidence from the text', 'Explain how the evidence supports the claim in writing'],
      steps: ['Show a model paragraph. Color-code claim, evidence, and explanation.', 'Students build one paragraph together with the teacher.', 'Students write their own paragraph on a new question.', 'Partners check each other with the color code.'],
      frames: ['I think ___ (claim).', 'The text says, "___" (evidence).', 'This shows ___ because ___ (explanation).', 'This matters because ___.'],
      adaptations: {
        1: 'Students draw the claim and label it. The teacher writes their spoken explanation with them.',
        2: 'Students complete the paragraph frame with words from a word bank.',
        3: 'Students write the paragraph with frames for the explanation only.',
        4: 'Students write without frames and add a counterclaim and a response.'
      },
      check: 'Use a 4-point rubric: 1 = claim only, 2 = claim + evidence, 3 = clear explanation, 4 = explanation + reasoning about why it matters.',
      materials: 'Model paragraph, color pencils, rubric', credit: 'Claim–evidence–reasoning (McNeill & Krajcik, 2012)', status: 'sample'
    },
    {
      id: 'say-it-then-write-it', name: 'Say It, Then Write It', category: 'production',
      domains: ['speaking', 'writing'], grades: ['K-2', '3-5', '6-8', '9-12'], minutes: 15,
      studentsWill: ['Rehearse an answer aloud with a partner', 'Improve the answer after partner feedback', 'Write the improved answer'],
      steps: ['Pose a question that needs a reason, not just a fact.', 'Partner A says an answer; Partner B asks "Why?" or "Can you add an example?".', 'Partners switch.', 'Each student writes the improved version.'],
      frames: ['My answer is ___ because ___.', 'Can you say more about ___?', 'Now I think ___, because ___.'],
      adaptations: {
        1: 'Students answer orally with a frame and a picture. The teacher or partner writes it; the student copies one key word.',
        2: 'Students say the full frame twice, then write it with a word bank.',
        3: 'Students write the answer and add one detail from the partner talk.',
        4: 'Students compare their first and second answers and write what changed in their thinking.'
      },
      check: 'Compare the spoken first answer with the written answer. Did the writing keep the reason?',
      materials: 'Question card, frame strip', credit: 'Oral rehearsal before writing (DIALD sample)', status: 'sample'
    },
    {
      id: 'partner-talk-moves', name: 'Partner Talk Moves', category: 'oral',
      domains: ['listening', 'speaking'], grades: ['K-2', '3-5', '6-8', '9-12'], minutes: 15,
      studentsWill: ['Discuss an academic question with a partner', 'Use talk moves: clarify, support with evidence, build on an idea', 'Listen and paraphrase the partner'],
      steps: ['Teach one talk move at a time with a model conversation.', 'Give partners an open question about the content.', 'Partners must use the new move at least twice.', 'Share one idea from the partner with the class.'],
      frames: ['What do you mean by ___?', 'Can you give an example from the text?', 'I want to add to your idea…', 'So you are saying that ___?'],
      adaptations: {
        1: 'Use yes/no and either/or questions with pictures. Model one move: "Can you show me?".',
        2: 'Practice one move with a full frame card. Partners take turns with a timer.',
        3: 'Use two or three moves. Partners keep a tally of the moves they used.',
        4: 'Students choose moves without cards and reflect on which move changed the conversation.'
      },
      check: 'Listen to two pairs. Note if students paraphrase correctly and support ideas with evidence.',
      materials: 'Talk-move cards', credit: 'Academic conversations (Zwiers & Crawford, 2011)', status: 'sample'
    },
    {
      id: 'cognate-detectives', name: 'Cognate Detectives', category: 'assets',
      domains: ['reading', 'listening'], grades: ['3-5', '6-8', '9-12'], minutes: 15,
      studentsWill: ['Find words in a text that look like words in their home language', 'Check if the meaning is the same (true or false cognate)', 'Use the cognates to explain the text'],
      steps: ['Show three examples (e.g., "important / importante").', 'Students search a short text for possible cognates.', 'They check meanings with a partner or dictionary.', 'Add true cognates to a class chart.'],
      frames: ['___ looks like ___ in my language.', 'It is a true cognate because both mean ___.', 'It is a false cognate because ___ means ___, but ___ means ___.'],
      adaptations: {
        1: 'The teacher reads aloud and students raise a hand when they hear a word that sounds familiar.',
        2: 'Students circle cognates in a short, highlighted list.',
        3: 'Students find cognates in a full paragraph and sort true and false cognates.',
        4: 'Students explain how cognates helped them understand a hard sentence.'
      },
      check: 'Count true cognates found and ask one student to use a cognate to explain the text.',
      materials: 'Short text, bilingual dictionary', credit: 'Cognate instruction (Carlo et al., 2004)', status: 'sample'
    },
    {
      id: 'get-the-gist', name: 'Get the Gist', category: 'comprehension',
      domains: ['reading', 'writing'], grades: ['3-5', '6-8', '9-12'], minutes: 20,
      studentsWill: ['Find the who, what, when, where, why, and how in a paragraph', 'Write a gist statement in 20 words or fewer', 'Compare gist statements and choose the best one'],
      steps: ['Model one gist statement with a short paragraph.', 'Students answer the 5W+H questions for the next paragraph.', 'They write a gist of 20 words or fewer.', 'Groups vote on the clearest gist and explain why.'],
      frames: ['The paragraph is about ___ who ___ because ___.', 'My gist is better because it includes ___.'],
      adaptations: {
        1: 'Students answer who and what with pictures or words. The gist is written together.',
        2: 'Students fill a 5W+H chart with a word bank and complete a gist frame.',
        3: 'Students write a gist of 20 words or fewer with the chart.',
        4: 'Students write a 10-word gist and explain what they left out and why.'
      },
      check: 'Collect gist statements. Does each one keep the main idea and leave out small details?',
      materials: '5W+H chart', credit: 'GIST summarizing (Cunningham, 1982)', status: 'sample'
    }
  ];

  const pathways = [
    {
      id: 'guided-reading-comprehension', title: 'Guided Reading Comprehension', status: 'sample',
      skill: 'Understand and explain grade-level texts', quadrants: ['Q1', 'Q3'], domains: ['reading'],
      grades: ['3-5', '6-8', '9-12'], weeks: 8,
      summary: 'For learners whose reading is behind their oral language. Moves from teacher modeling to independent comprehension of grade-level texts.',
      objectives: ['Identify the main idea and key details of a grade-level text', 'Ask and answer questions that require evidence from the text', 'Summarize a text in their own words'],
      phases: [
        { name: 'Weeks 1–2 · Model', focus: 'The teacher models how good readers think.', activities: ['think-aloud-annotation', 'cognate-detectives'] },
        { name: 'Weeks 3–5 · Guided practice', focus: 'Small groups practice comprehension strategies with support.', activities: ['reciprocal-teaching', 'get-the-gist'] },
        { name: 'Weeks 6–8 · Independent practice', focus: 'Learners use the strategies on new texts with less support.', activities: ['get-the-gist', 'evidence-sort'] }
      ],
      monitoring: { measure: 'Short comprehension check (10 questions) every 2 weeks', baseline: '45%', goal: '75%' },
      pdf: null
    },
    {
      id: 'structured-written-explanations', title: 'Structured Written Explanations', status: 'sample',
      skill: 'Write a claim and explain the evidence', quadrants: ['Q1', 'Q3'], domains: ['writing'],
      grades: ['3-5', '6-8', '9-12'], weeks: 8,
      summary: 'For learners who can talk about ideas but struggle to explain them in writing. Builds from oral rehearsal to an independent paragraph.',
      objectives: ['Write a clear claim about a text', 'Select evidence that supports the claim', 'Explain how the evidence supports the claim'],
      phases: [
        { name: 'Weeks 1–2 · Model', focus: 'Use oral language as a bridge to writing.', activities: ['say-it-then-write-it', 'claim-evidence-explain'] },
        { name: 'Weeks 3–5 · Guided practice', focus: 'Practice choosing and explaining evidence.', activities: ['evidence-sort', 'claim-evidence-explain'] },
        { name: 'Weeks 6–8 · Independent practice', focus: 'Write paragraphs with fewer frames.', activities: ['claim-evidence-explain'] }
      ],
      monitoring: { measure: 'Writing rubric (4 points) every 2 weeks', baseline: '1', goal: '3' },
      pdf: null
    },
    {
      id: 'academic-talk-from-text', title: 'Academic Talk from Text', status: 'sample',
      skill: 'Discuss academic ideas with evidence', quadrants: ['Q4', 'Q3'], domains: ['listening', 'speaking'],
      grades: ['K-2', '3-5', '6-8', '9-12'], weeks: 6,
      summary: 'For learners whose reading and writing are ahead of their oral language. Uses texts they understand as a bridge to academic talk.',
      objectives: ['Listen to and paraphrase a partner', 'Support spoken ideas with evidence from a text', 'Build on another person’s idea'],
      phases: [
        { name: 'Weeks 1–2 · Model', focus: 'Teach talk moves one at a time.', activities: ['partner-talk-moves'] },
        { name: 'Weeks 3–4 · Guided practice', focus: 'Talk about texts with roles and frames.', activities: ['reciprocal-teaching', 'partner-talk-moves'] },
        { name: 'Weeks 5–6 · Independent practice', focus: 'Longer conversations with fewer frames.', activities: ['say-it-then-write-it'] }
      ],
      monitoring: { measure: 'Speaking checklist (talk moves used with evidence) every 2 weeks', baseline: '1 of 4', goal: '3 of 4' },
      pdf: null
    },
    {
      id: 'extending-academic-argument', title: 'Extending Academic Argument', status: 'sample',
      skill: 'Build an argument with a counterclaim', quadrants: ['Q2'], domains: ['writing', 'speaking'],
      grades: ['6-8', '9-12'], weeks: 6,
      summary: 'For learners with balanced, strong development who need more complex academic language: counterclaims, precise vocabulary, and reasoning.',
      objectives: ['State and defend a claim orally and in writing', 'Address a counterclaim with evidence', 'Explain reasoning with precise academic language'],
      phases: [
        { name: 'Weeks 1–2 · Model', focus: 'Analyze strong arguments.', activities: ['evidence-sort', 'partner-talk-moves'] },
        { name: 'Weeks 3–4 · Guided practice', focus: 'Debate, then write.', activities: ['say-it-then-write-it', 'claim-evidence-explain'] },
        { name: 'Weeks 5–6 · Independent practice', focus: 'Independent argument writing.', activities: ['claim-evidence-explain'] }
      ],
      monitoring: { measure: 'Argument rubric (4 points) every 2 weeks', baseline: '2', goal: '4' },
      pdf: null
    }
  ];

  const api = { CATEGORIES, GRADES, activities, pathways };
  if (typeof module !== 'undefined') module.exports = api;
  root.DIALDLibrary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
