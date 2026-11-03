/* DIALD Intervention Library.
   Activities are written by DIALD in our own words. Each one names the author of the original
   strategy in its credit. Lessons are organized by grade band → profile (quadrant) → stage (12 weeks). */
(function (root) {
  'use strict';

  // Grade bands used across the library.
  const GRADES = ['2-3', '4-5', '6-8', '9-12'];
  const BANDS = {
    '2-3': { name: 'Grades 2–3', short: 'Early elementary' },
    '4-5': { name: 'Grades 4–5', short: 'Upper elementary' },
    '6-8': { name: 'Grades 6–8', short: 'Middle school' },
    '9-12': { name: 'Grades 9–12', short: 'High school' }
  };

  const CATEGORIES = {
    talk: { name: 'Academic talk', combo: 'Listening + Speaking', line: 'Structured conversations that build academic language out loud.' },
    reading: { name: 'Purposeful reading', combo: 'Reading + Listening', line: 'Routines to understand and talk about grade-level texts.' },
    writing: { name: 'Academic writing', combo: 'Writing + Speaking', line: 'From oral rehearsal to clear sentences and paragraphs.' },
    words: { name: 'Words and word study', combo: 'All domains', line: 'Academic vocabulary, word parts, and word meaning in context.' },
    listening: { name: 'Focused listening', combo: 'Listening + Writing', line: 'Listening for meaning, details, and language.' },
    argument: { name: 'Opinions and argument', combo: 'Speaking + Writing', line: 'Taking a position and supporting it with reasons and evidence.' },
    assets: { name: 'Language and identity', combo: 'Home language as a resource', line: 'Using students’ languages and experiences to learn English.' },
    checks: { name: 'Quick checks', combo: 'Formative assessment', line: 'Short checks to see who understood and who needs more support.' }
  };

  const A = (o) => Object.assign({ status: 'ready', quadrants: ['Q1', 'Q2', 'Q3', 'Q4'] }, o);
  const activities = [
    /* ---------- Academic talk ---------- */
    A({
      id: 'think-pair-share', name: 'Think-Pair-Share', category: 'talk', domains: ['listening', 'speaking'], grades: ['2-3', '4-5', '6-8', '9-12'], minutes: 10,
      group: 'Pairs, whole class', quadrants: ['Q4', 'Q3', 'Q1'],
      purpose: 'Gives every student time to think and a safe first audience before speaking to the whole class.',
      studentsWill: ['Think quietly about a question', 'Share their answer with a partner using a frame', 'Report their partner’s idea to the class'],
      steps: ['Ask an open question that needs a reason.', 'Give 30–60 seconds of silent think time (students can jot or draw).', 'Partners take turns: A shares for 1 minute, B paraphrases, then switch.', 'Call on students to share their partner’s idea, not their own.'],
      example: 'Science, grade 7: "Why do you think the town flooded more this year?" Students think, share with a partner, then report: "My partner thinks… because…".',
      frames: ['I think ___ because ___.', 'So you are saying that ___?', 'My partner thinks ___ because ___.'],
      adaptations: { 1: 'Use a picture question and either/or choices. Partners can answer in the home language first, then say one English word.', 2: 'Give a full frame card and a word bank. Students say the frame twice before switching.', 3: 'Students add one detail or example to their reason.', 4: 'Students build on the partner’s idea: "I agree and I would add…" or "I see it differently because…".' },
      check: 'Listen to three pairs. Can each student give a reason, and can the partner paraphrase it?',
      materials: 'Question on the board, frame card', credit: 'Think-Pair-Share (Lyman, 1981)'
    }),
    A({
      id: 'inside-outside-circle', name: 'Inside-Outside Circle', category: 'talk', domains: ['listening', 'speaking'], grades: ['2-3', '4-5', '6-8', '9-12'], minutes: 15,
      group: 'Whole class in two circles', quadrants: ['Q4', 'Q3'],
      purpose: 'Many short conversations with new partners, so students repeat and improve the same answer several times.',
      studentsWill: ['Answer the same question with three different partners', 'Improve their answer each time', 'Listen and ask a follow-up question'],
      steps: ['Students form two circles facing each other.', 'Ask a question. Inside circle answers for 45 seconds; outside circle asks one follow-up question.', 'Switch roles, then the outside circle moves one person to the right.', 'Repeat 3 times. Students say what they added to their answer.'],
      example: 'ELA, grade 9: "Which character changed the most, and how do you know?" After three partners, answers include a quote from the text.',
      frames: ['My answer is ___ because ___.', 'Can you give an example?', 'This time I added ___.'],
      adaptations: { 1: 'Use pictures of the characters. Students point and name; partners model a short sentence to repeat.', 2: 'Give the answer frame. Students may read the frame the first time and say it without reading the third time.', 3: 'Students must add new evidence with each partner.', 4: 'Students challenge each partner with a "What if…?" question.' },
      check: 'Ask two students what they added between their first and third answer.',
      materials: 'Space to move, question card', credit: 'Inside-Outside Circle (Kagan, 1994)'
    }),
    A({
      id: 'fishbowl-discussion', name: 'Fishbowl Discussion', category: 'talk', domains: ['listening', 'speaking'], grades: ['4-5', '6-8', '9-12'], minutes: 25,
      group: 'Small group of 4–6 inside, rest of class outside', quadrants: ['Q4', 'Q2'],
      purpose: 'A small group models an academic discussion while the class observes the language they use.',
      studentsWill: ['Discuss a question in front of the class (inside group)', 'Track talk moves and evidence (outside group)', 'Give feedback with specific examples'],
      steps: ['Choose 4–6 students for the inside circle. Give them a question and a text.', 'The outside group gets an observation sheet: talk moves, evidence, new words.', 'Inside group discusses for 8–10 minutes.', 'Outside group gives feedback; then switch groups.'],
      example: 'Social studies, grade 8: "Was the Boston Tea Party a protest or a crime?" Observers mark each time a speaker uses evidence.',
      frames: ['I agree with ___ because ___.', 'I would like to add ___.', 'I noticed that ___ used the word ___.'],
      adaptations: { 1: 'Level 1 students observe with a picture checklist and add one word during the feedback.', 2: 'Inside students get frame cards; each must speak at least twice.', 3: 'Inside students must cite the text once.', 4: 'Students lead the discussion and invite quiet speakers in.' },
      check: 'Collect observation sheets. Did observers note specific language, not only "good job"?',
      materials: 'Observation sheets, text', credit: 'Fishbowl discussion (common discussion structure; see Zwiers & Crawford, 2011)'
    }),
    A({
      id: 'partner-talk-moves', name: 'Partner Talk Moves', category: 'talk', domains: ['listening', 'speaking'], grades: ['2-3', '4-5', '6-8', '9-12'], minutes: 15,
      group: 'Pairs', quadrants: ['Q4', 'Q3', 'Q1'],
      purpose: 'Teaches the moves of a real conversation: clarify, support with evidence, and build on an idea.',
      studentsWill: ['Discuss an academic question with a partner', 'Use talk moves: clarify, support with evidence, build on an idea', 'Listen and paraphrase the partner'],
      steps: ['Teach one talk move at a time with a model conversation.', 'Give partners an open question about the content.', 'Partners must use the new move at least twice.', 'Share one idea from the partner with the class.'],
      example: 'Math, grade 6: "Which strategy is faster for this problem, and why?" Partners must ask "Can you show me an example?" at least twice.',
      frames: ['What do you mean by ___?', 'Can you give an example from the text?', 'I want to add to your idea…', 'So you are saying that ___?'],
      adaptations: { 1: 'Use yes/no and either/or questions with pictures. Model one move: "Can you show me?".', 2: 'Practice one move with a full frame card. Partners take turns with a timer.', 3: 'Use two or three moves. Partners keep a tally of the moves they used.', 4: 'Students choose moves without cards and reflect on which move changed the conversation.' },
      check: 'Listen to two pairs. Note if students paraphrase correctly and support ideas with evidence.',
      materials: 'Talk-move cards', credit: 'Academic conversations (Zwiers & Crawford, 2011)'
    }),
    /* ---------- Purposeful reading ---------- */
    A({
      id: 'think-aloud-annotation', name: 'Think-Aloud Annotation', category: 'reading', domains: ['listening', 'reading'], grades: ['4-5', '6-8', '9-12'], minutes: 20,
      group: 'Whole class, then pairs', quadrants: ['Q1', 'Q3'],
      purpose: 'Makes a good reader’s thinking visible, so students learn what to notice in a text.',
      studentsWill: ['Listen as the teacher thinks aloud about a short text', 'Mark the text with symbols for main idea, question, and new word', 'Explain to a partner why they marked each place'],
      steps: ['Choose a short paragraph (100–200 words) from the class text.', 'Read it aloud and say your thinking: "This part is important because…".', 'Students annotate the next paragraph with the same 3 symbols.', 'Partners compare marks and must justify one choice they disagree on.'],
      example: 'Science, grade 7: a paragraph about the water cycle. The teacher marks ★ "evaporation is the main idea", ? "why does it cool?", and ○ "condensation".',
      frames: ['I marked this as the main idea because…', 'I have a question here: why…?', 'I disagree with your mark because the text says…'],
      adaptations: { 1: 'Use a picture-supported text. Students point to and mark only one symbol (★ important). Accept answers in the home language.', 2: 'Use two symbols. Give a word bank with the key words from the text. Students explain with a frame.', 3: 'Use all three symbols. Students write one short note in the margin for each mark.', 4: 'Students choose their own symbols and explain the author’s purpose for one paragraph.' },
      check: 'Collect one annotated paragraph. Count how many marks have a correct, text-based reason.',
      materials: 'Short text copy, symbol key card', credit: 'Think-aloud modeling (Davey, 1983)'
    }),
    A({
      id: 'reciprocal-teaching', name: 'Reciprocal Teaching Roles', category: 'reading', domains: ['reading', 'speaking', 'listening'], grades: ['4-5', '6-8', '9-12'], minutes: 25,
      group: 'Groups of 4', quadrants: ['Q1', 'Q3', 'Q2'],
      purpose: 'Students take turns leading four comprehension strategies, so they practice reading and academic talk together.',
      studentsWill: ['Read a text in small groups', 'Take a role: Predictor, Questioner, Clarifier, or Summarizer', 'Lead the group in their role and rotate'],
      steps: ['Model all four roles with one paragraph.', 'Give each student a role card with frames.', 'Groups read one section at a time; each role leads for 1–2 minutes.', 'Rotate roles for the next section.'],
      example: 'ELA, grade 8: an article on school start times, read in four sections so every student leads each role once.',
      frames: ['I predict ___ because the text says ___.', 'A question I have is ___. I think the answer is ___ because ___.', 'The word ___ was confusing. I think it means ___ because ___.', 'The most important idea is ___. I chose it because ___.'],
      adaptations: { 1: 'Use only the Predictor role with pictures. The teacher reads aloud. Students point and answer with one word or the home language.', 2: 'Use two roles (Predictor and Clarifier) with full sentence frames and a word bank.', 3: 'Use all four roles with frames. Students write their summary in 1–2 sentences.', 4: 'Students lead without frames and must connect their summary to the text’s bigger question.' },
      check: 'Listen to one group for 3 minutes. Note which roles each student can lead without help.',
      materials: 'Role cards, sectioned text', credit: 'Reciprocal teaching (Palincsar & Brown, 1984)'
    }),
    A({
      id: 'get-the-gist', name: 'Get the Gist', category: 'reading', domains: ['reading', 'writing'], grades: ['4-5', '6-8', '9-12'], minutes: 20,
      group: 'Pairs or groups of 3', quadrants: ['Q1', 'Q3'],
      purpose: 'Teaches students to find the main idea and say it in a short summary.',
      studentsWill: ['Find the who, what, when, where, why, and how in a paragraph', 'Write a gist statement in 20 words or fewer', 'Compare gist statements and choose the best one'],
      steps: ['Model one gist statement with a short paragraph.', 'Students answer the 5W+H questions for the next paragraph.', 'They write a gist of 20 words or fewer.', 'Groups vote on the clearest gist and explain why.'],
      example: 'Social studies, grade 6: a paragraph on the Silk Road becomes "Traders moved goods and ideas between Asia and Europe for centuries."',
      frames: ['The paragraph is about ___ who ___ because ___.', 'My gist is better because it includes ___.'],
      adaptations: { 1: 'Students answer who and what with pictures or words. The gist is written together.', 2: 'Students fill a 5W+H chart with a word bank and complete a gist frame.', 3: 'Students write a gist of 20 words or fewer with the chart.', 4: 'Students write a 10-word gist and explain what they left out and why.' },
      check: 'Collect gist statements. Does each one keep the main idea and leave out small details?',
      materials: '5W+H chart', credit: 'GIST summarizing (Cunningham, 1982)'
    }),
    A({
      id: 'anticipation-guide', name: 'Anticipation Guide', category: 'reading', domains: ['reading', 'speaking'], grades: ['4-5', '6-8', '9-12'], minutes: 20,
      group: 'Individual, then pairs', quadrants: ['Q1', 'Q3', 'Q2'],
      purpose: 'Activates what students already think about a topic and gives them a reason to read.',
      studentsWill: ['Agree or disagree with 4–5 statements before reading', 'Read to check their ideas', 'Explain with evidence what changed in their thinking'],
      steps: ['Write 4–5 statements about the big ideas of the text (some true, some debatable).', 'Students mark agree or disagree and tell a partner why.', 'Students read and find evidence for each statement.', 'They mark again after reading and explain any change.'],
      example: 'Science, grade 8: "Plastic in the ocean only hurts big animals." Students disagree after reading about microplastics and cite the paragraph.',
      frames: ['Before reading I agreed because ___.', 'Now I disagree because the text says ___.', 'My thinking stayed the same because ___.'],
      adaptations: { 1: 'Use 2–3 statements with pictures. Students show thumbs up or down and point to a picture in the text.', 2: 'Use 3 statements and a word bank. Students find one sentence of evidence with help.', 3: 'Students write evidence for each statement.', 4: 'Students write a new statement for classmates to debate.' },
      check: 'Collect the guide. Does each "after" answer have evidence from the text?',
      materials: 'Guide sheet, text', credit: 'Anticipation guides (Readence, Bean & Baldwin, 1981)'
    }),
    A({
      id: 'partner-reading', name: 'Partner Reading', category: 'reading', domains: ['reading', 'listening', 'speaking'], grades: ['2-3', '4-5', '6-8'], minutes: 15,
      group: 'Pairs', quadrants: ['Q3', 'Q1'],
      purpose: 'Builds reading fluency and comprehension with a partner who listens and asks a question.',
      studentsWill: ['Take turns reading a paragraph aloud', 'Listen and help with hard words', 'Retell what the partner read'],
      steps: ['Pair students (a stronger and a developing reader work well).', 'Partner A reads a paragraph; B follows and helps with words after 3 seconds.', 'B retells the paragraph in one or two sentences.', 'Switch for the next paragraph.'],
      example: 'Grade 3: a short story about a lost dog. After each page, the listener retells: "First the dog ran away. Then…".',
      frames: ['First ___. Then ___.', 'The most important part was ___.', 'Can you read that sentence again?'],
      adaptations: { 1: 'The teacher or partner reads first; the student echoes one sentence at a time.', 2: 'Use a shorter text and a retell frame with pictures.', 3: 'Students retell with two details and one new word.', 4: 'Students ask the partner a "why" question after each paragraph.' },
      check: 'Listen to one pair for 2 minutes. Note fluency and whether the retell keeps the main idea.',
      materials: 'Leveled or class text, retell card', credit: 'Partner reading (Fuchs, Fuchs, Mathes & Simmons, 1997, PALS)'
    }),
    /* ---------- Academic writing ---------- */
    A({
      id: 'claim-evidence-explain', name: 'Claim–Evidence–Explain Paragraph', category: 'writing', domains: ['writing', 'speaking'], grades: ['4-5', '6-8', '9-12'], minutes: 30,
      group: 'Whole class, then individual', quadrants: ['Q1', 'Q2', 'Q3'],
      purpose: 'Teaches the structure of an academic paragraph: a claim, evidence, and an explanation of how the evidence supports the claim.',
      studentsWill: ['State a claim about a text', 'Choose evidence from the text', 'Explain how the evidence supports the claim in writing'],
      steps: ['Show a model paragraph. Color-code claim, evidence, and explanation.', 'Students build one paragraph together with the teacher.', 'Students write their own paragraph on a new question.', 'Partners check each other with the color code.'],
      example: 'Science, grade 7: "Should our school ban plastic bottles?" Claim in blue, quote from the article in green, explanation in orange.',
      frames: ['I think ___ (claim).', 'The text says, "___" (evidence).', 'This shows ___ because ___ (explanation).', 'This matters because ___.'],
      adaptations: { 1: 'Students draw the claim and label it. The teacher writes their spoken explanation with them.', 2: 'Students complete the paragraph frame with words from a word bank.', 3: 'Students write the paragraph with frames for the explanation only.', 4: 'Students write without frames and add a counterclaim and a response.' },
      check: 'Use a 4-point rubric: 1 = claim only, 2 = claim + evidence, 3 = clear explanation, 4 = explanation + reasoning about why it matters.',
      materials: 'Model paragraph, color pencils, rubric', credit: 'Claim–evidence–reasoning (McNeill & Krajcik, 2012)'
    }),
    A({
      id: 'say-it-then-write-it', name: 'Say It, Then Write It', category: 'writing', domains: ['speaking', 'writing'], grades: ['2-3', '4-5', '6-8', '9-12'], minutes: 15,
      group: 'Pairs', quadrants: ['Q1', 'Q3'],
      purpose: 'Uses oral rehearsal as a bridge to writing, which helps students whose speaking is ahead of their writing.',
      studentsWill: ['Rehearse an answer aloud with a partner', 'Improve the answer after partner feedback', 'Write the improved answer'],
      steps: ['Pose a question that needs a reason, not just a fact.', 'Partner A says an answer; Partner B asks "Why?" or "Can you add an example?".', 'Partners switch.', 'Each student writes the improved version.'],
      example: 'ELA, grade 5: "Was the character brave or careless?" Students say it, get one question from the partner, then write two sentences.',
      frames: ['My answer is ___ because ___.', 'Can you say more about ___?', 'Now I think ___, because ___.'],
      adaptations: { 1: 'Students answer orally with a frame and a picture. The teacher or partner writes it; the student copies one key word.', 2: 'Students say the full frame twice, then write it with a word bank.', 3: 'Students write the answer and add one detail from the partner talk.', 4: 'Students compare their first and second answers and write what changed in their thinking.' },
      check: 'Compare the spoken first answer with the written answer. Did the writing keep the reason?',
      materials: 'Question card, frame strip', credit: 'Oral rehearsal before writing (DIALD activity)'
    }),
    A({
      id: 'dialogue-journal', name: 'Dialogue Journal', category: 'writing', domains: ['writing', 'reading'], grades: ['2-3', '4-5', '6-8', '9-12'], minutes: 10,
      group: 'Individual with the teacher', quadrants: ['Q1', 'Q3', 'Q4'],
      purpose: 'A written conversation between the student and the teacher that builds writing fluency without the pressure of grades.',
      studentsWill: ['Write a short entry about a topic or question', 'Read the teacher’s reply', 'Answer the teacher’s question in the next entry'],
      steps: ['Give each student a journal (paper or digital).', 'Students write 5–10 minutes, 2–3 times a week.', 'The teacher replies with a short comment and one question, modeling correct language (no red pen).', 'Students read the reply and continue the conversation.'],
      example: 'Grade 6: "What is something you are good at that school doesn’t know about?" The teacher replies and asks a follow-up question.',
      frames: ['Today I want to tell you about ___.', 'I think ___ because ___.', 'To answer your question, ___.'],
      adaptations: { 1: 'Students draw and label; they may write in the home language plus one English sentence.', 2: 'Give 2–3 starter frames each time.', 3: 'Students write at least 5 sentences and use one new word from class.', 4: 'Students ask the teacher a question back and give reasons for their opinions.' },
      check: 'Every 2 weeks, count sentences per entry and note one language feature that is improving.',
      materials: 'Notebook or digital journal', credit: 'Dialogue journals (Staton, 1987; Peyton, 2000)'
    }),
    A({
      id: 'somebody-wanted-but-so', name: 'Somebody–Wanted–But–So–Then', category: 'writing', domains: ['reading', 'writing'], grades: ['2-3', '4-5', '6-8'], minutes: 15,
      group: 'Individual or pairs', quadrants: ['Q1', 'Q3'],
      purpose: 'A simple frame for writing a one-sentence summary of a story or a historical event.',
      studentsWill: ['Identify the character, goal, problem, and solution', 'Write a one-sentence summary with the frame', 'Compare summaries with a partner'],
      steps: ['Model the frame with a story everyone knows.', 'Students fill the five parts in a chart for the class text.', 'They join the parts into one sentence.', 'Partners compare and improve one word.'],
      example: 'Social studies, grade 8: "Rosa Parks (somebody) wanted to keep her seat, but the driver told her to move, so she refused, then the bus boycott began."',
      frames: ['___ wanted ___, but ___, so ___, then ___.'],
      adaptations: { 1: 'Use pictures for each part and say the sentence together.', 2: 'Fill the chart with a word bank, then write the sentence.', 3: 'Write the sentence independently.', 4: 'Write two summaries from two characters’ points of view.' },
      check: 'Collect the sentence. Does it include the problem and how it was solved?',
      materials: 'SWBST chart', credit: 'Somebody–Wanted–But–So (Macon, Bewell & Vogt, 1991)'
    }),
    /* ---------- Words and word study ---------- */
    A({
      id: 'frayer-model', name: 'Frayer Model', category: 'words', domains: ['reading', 'writing', 'speaking'], grades: ['2-3', '4-5', '6-8', '9-12'], minutes: 15,
      group: 'Individual or pairs', quadrants: ['Q1', 'Q2', 'Q3', 'Q4'],
      purpose: 'Builds deep understanding of one key academic word with a definition, characteristics, examples, and non-examples.',
      studentsWill: ['Define a key word in their own words', 'List characteristics, examples, and non-examples', 'Use the word in an academic sentence'],
      steps: ['Choose 1–2 key words from the unit (high-utility, not rare).', 'Model one Frayer chart with the class.', 'Pairs complete a chart for the next word.', 'Each student writes a sentence that shows the meaning.'],
      example: 'Science, grade 6: "habitat". Example: a pond for a frog. Non-example: a backpack. Sentence: "A desert is a habitat for animals that need little water."',
      frames: ['___ means ___.', 'An example of ___ is ___ because ___.', '___ is not an example because ___.'],
      adaptations: { 1: 'Use pictures for examples and non-examples. Add the word in the home language.', 2: 'Give the definition; students sort example and non-example pictures.', 3: 'Students write the definition in their own words.', 4: 'Students compare two related words (habitat vs. ecosystem).' },
      check: 'Ask students to give a new example and explain why it fits.',
      materials: 'Frayer chart', credit: 'Frayer model (Frayer, Frederick & Klausmeier, 1969)'
    }),
    A({
      id: 'vocabulary-rating', name: 'Vocabulary Rating', category: 'words', domains: ['reading', 'speaking'], grades: ['4-5', '6-8', '9-12'], minutes: 10,
      group: 'Individual, then pairs', quadrants: ['Q1', 'Q2', 'Q3', 'Q4'],
      purpose: 'Students rate how well they know the unit words before and after the unit, so teacher and student see growth.',
      studentsWill: ['Rate each word: I don’t know it / I have seen it / I can explain it / I can use it', 'Teach a partner a word they know', 'Rate again at the end of the unit'],
      steps: ['List 8–10 key words of the unit.', 'Students rate each word from 1 to 4.', 'Partners teach each other one word they rated 3 or 4.', 'Repeat the rating at the end of the unit and compare.'],
      example: 'ELA, grade 9: "conflict, motive, theme, symbol…". At the end, students circle words that moved up.',
      frames: ['I can explain ___: it means ___.', 'I have seen ___ in ___, but I am not sure what it means.'],
      adaptations: { 1: 'Use 4–5 words with pictures and a thumbs scale.', 2: 'Rate 6 words; explain one with a frame.', 3: 'Rate all words; explain two with examples.', 4: 'Students choose two extra words from the text to add and teach.' },
      check: 'Compare before and after ratings. Which words still need teaching?',
      materials: 'Rating chart', credit: 'Knowledge rating (Blachowicz, 1986)'
    }),
    A({
      id: 'word-sort', name: 'Word Sort', category: 'words', domains: ['reading', 'speaking'], grades: ['2-3', '4-5', '6-8'], minutes: 15,
      group: 'Pairs or groups of 3', quadrants: ['Q3', 'Q1'],
      purpose: 'Students sort words by meaning, spelling pattern, or word part, and explain their rule.',
      studentsWill: ['Sort word cards into groups', 'Explain the rule for each group', 'Add a new word to each group'],
      steps: ['Prepare 12–16 word cards with a clear pattern (prefixes, -ed sounds, topics).', 'In an open sort, students make their own groups; in a closed sort, give the headings.', 'Groups explain their rule to another group.', 'Students write two new words for each group.'],
      example: 'Grade 4: un-, re-, pre- words (unhappy, redo, preview). Students explain: "re- means again."',
      frames: ['These words go together because ___.', 'The rule is ___.', 'Another word for this group is ___.'],
      adaptations: { 1: 'Sort pictures with words by topic; say each word aloud.', 2: 'Closed sort with two headings and a model.', 3: 'Closed sort with three headings; explain the rule in a sentence.', 4: 'Open sort; students find words in a text that fit.' },
      check: 'Ask each group to explain their rule and add one word correctly.',
      materials: 'Word cards', credit: 'Word study sorts (Bear, Invernizzi, Templeton & Johnston, Words Their Way)'
    }),
    /* ---------- Focused listening ---------- */
    A({
      id: 'dictogloss', name: 'Dictogloss', category: 'listening', domains: ['listening', 'writing', 'speaking'], grades: ['4-5', '6-8', '9-12'], minutes: 25,
      group: 'Groups of 3–4', quadrants: ['Q4', 'Q1', 'Q2'],
      purpose: 'Students listen to a short text and rebuild it together, so they notice grammar and academic language.',
      studentsWill: ['Listen to a short text read twice', 'Write key words while listening', 'Rebuild the text with their group and compare it with the original'],
      steps: ['Choose a short paragraph (3–5 sentences) with a language feature you want to teach.', 'Read it once at normal speed; students only listen.', 'Read again; students write key words.', 'Groups rebuild the text, then compare with the original and discuss differences.'],
      example: 'Science, grade 7: a paragraph that uses "because" and "as a result". Groups notice how cause and effect are linked.',
      frames: ['We wrote ___, but the text said ___.', 'The author used ___ to show ___.'],
      adaptations: { 1: 'Use 2 short sentences and pictures. Students listen and order picture cards.', 2: 'Give a partial text with blanks to complete while listening.', 3: 'Students rebuild the full paragraph with their group.', 4: 'Students rewrite the paragraph in a different tense or point of view.' },
      check: 'Compare the group’s version with the original. Did they keep the meaning and the target language feature?',
      materials: 'Short text', credit: 'Dictogloss (Wajnryb, 1990)'
    }),
    A({
      id: 'listen-and-draw', name: 'Listen and Draw', category: 'listening', domains: ['listening', 'speaking'], grades: ['2-3', '4-5', '6-8'], minutes: 15,
      group: 'Pairs', quadrants: ['Q4', 'Q3'],
      purpose: 'One student describes, the other draws, so both practice precise vocabulary and listening for details.',
      studentsWill: ['Describe a picture or diagram without showing it', 'Draw from a partner’s description', 'Compare and discuss what was missing'],
      steps: ['Give Partner A a picture or diagram from the content.', 'A describes it; B draws without seeing it and may ask questions.', 'Compare the drawing with the picture.', 'Partners list the words that helped most.'],
      example: 'Science, grade 6: A describes a diagram of a plant cell; B draws and labels it.',
      frames: ['In the top left corner there is ___.', 'It is next to / above / below ___.', 'Can you repeat where the ___ is?'],
      adaptations: { 1: 'Use a simple picture and a word bank with position words.', 2: 'Give the position words and shape words on a card.', 3: 'Use a content diagram with labels.', 4: 'Describe a process with steps, not a still picture.' },
      check: 'Compare the drawing and picture. Which details did the describer leave out?',
      materials: 'Pictures or diagrams, paper', credit: 'Information-gap tasks (Doughty & Pica, 1986)'
    }),
    /* ---------- Opinions and argument ---------- */
    A({
      id: 'evidence-sort', name: 'Evidence Sort and Defend', category: 'argument', domains: ['reading', 'writing'], grades: ['4-5', '6-8', '9-12'], minutes: 20,
      group: 'Pairs', quadrants: ['Q1', 'Q2'],
      purpose: 'Students judge which evidence really supports a claim and explain why.',
      studentsWill: ['Read a claim and six pieces of evidence', 'Sort evidence as strong, weak, or not related', 'Write why their strongest piece supports the claim'],
      steps: ['Write one clear claim about the class text.', 'Prepare six evidence cards: two strong, two weak, two not related.', 'Partners sort the cards and must agree before moving a card.', 'Each student writes one sentence defending the strongest card.'],
      example: 'ELA, grade 8: claim "Social media harms teens’ sleep." Cards include a survey result (strong), an opinion (weak), and a fact about phones (not related).',
      frames: ['This evidence is strong because it shows…', 'This evidence is weak because it does not explain…', 'This is not related because the claim is about…, but this is about…'],
      adaptations: { 1: 'Use three cards with pictures. Students sort into "yes" and "no" and say one word to explain.', 2: 'Use four cards. Students sort and complete one frame orally, then copy it.', 3: 'Use six cards. Students write a defense sentence with "because".', 4: 'Students write a short evidence card of their own that is stronger than the ones given, and explain why.' },
      check: 'Collect the defense sentence. Does it explain HOW the evidence supports the claim, not just repeat it?',
      materials: 'Evidence cards (printed or digital)', credit: 'DIALD activity'
    }),
    A({
      id: 'four-corners', name: 'Four Corners', category: 'argument', domains: ['listening', 'speaking'], grades: ['2-3', '4-5', '6-8', '9-12'], minutes: 15,
      group: 'Whole class in 4 groups', quadrants: ['Q4', 'Q3', 'Q2'],
      purpose: 'Students move to a corner to show their opinion, then defend it with reasons in a small group and to the class.',
      studentsWill: ['Choose strongly agree, agree, disagree, or strongly disagree', 'Agree on the best reason with their corner', 'Listen to other corners and respond'],
      steps: ['Label the four corners. Read a debatable statement.', 'Students move to the corner that matches their opinion.', 'Each corner agrees on two reasons and chooses a speaker.', 'Speakers share; students may move corners if they change their mind and must explain why.'],
      example: 'Grade 6: "Homework should be optional." Students who move corners say: "I changed my mind because…".',
      frames: ['I (strongly) agree/disagree because ___.', 'I heard ___, and I want to respond ___.', 'I changed my mind because ___.'],
      adaptations: { 1: 'Use two corners (yes/no) with pictures. Students say one word or a short frame.', 2: 'Give reason cards to choose from.', 3: 'Each student adds one reason with an example.', 4: 'Speakers must respond to another corner’s reason before giving their own.' },
      check: 'Note which students give a reason, not only an opinion.',
      materials: 'Corner signs, statement', credit: 'Four Corners (Kagan, 1994)'
    }),
    A({
      id: 'philosophical-chairs', name: 'Philosophical Chairs', category: 'argument', domains: ['listening', 'speaking'], grades: ['6-8', '9-12'], minutes: 30,
      group: 'Whole class in two sides', quadrants: ['Q2', 'Q4'],
      purpose: 'A structured debate where students must summarize the other side before they respond.',
      studentsWill: ['Sit on the side that matches their position', 'Summarize the last speaker before responding', 'Write a reflection on how their thinking changed'],
      steps: ['Students read a short text with a debatable question.', 'They sit on the "agree" side, the "disagree" side, or the "undecided" middle.', 'Sides alternate speakers; each speaker first summarizes the previous one.', 'Students may move sides. End with a written reflection.'],
      example: 'Grade 10: "Should cities ban cars from downtown?" after reading two short articles.',
      frames: ['What I heard you say is ___.', 'I respectfully disagree because ___.', 'At first I thought ___, but now I think ___.'],
      adaptations: { 1: 'Level 1 students observe with a picture tally and join the reflection with a frame.', 2: 'Give summary and response frames on cards.', 3: 'Students cite the text once when they speak.', 4: 'Students raise a counterargument for their own side.' },
      check: 'Collect the reflection. Does it name an argument from the other side?',
      materials: 'Short texts, room set as two sides', credit: 'Philosophical chairs (adapted from Socratic seminar traditions; Paul & Elder)'
    }),
    /* ---------- Language and identity ---------- */
    A({
      id: 'cognate-detectives', name: 'Cognate Detectives', category: 'assets', domains: ['reading', 'listening'], grades: ['4-5', '6-8', '9-12'], minutes: 15,
      group: 'Pairs', quadrants: ['Q1', 'Q3', 'Q4'],
      purpose: 'Students use words they already know in their home language to understand English academic words.',
      studentsWill: ['Find words in a text that look like words in their home language', 'Check if the meaning is the same (true or false cognate)', 'Use the cognates to explain the text'],
      steps: ['Show three examples (e.g., "important / importante").', 'Students search a short text for possible cognates.', 'They check meanings with a partner or dictionary.', 'Add true cognates to a class chart.'],
      example: 'Science, grade 7 (Spanish speakers): "evaporation / evaporación, temperature / temperatura"; false cognate: "embarrassed / embarazada".',
      frames: ['___ looks like ___ in my language.', 'It is a true cognate because both mean ___.', 'It is a false cognate because ___ means ___, but ___ means ___.'],
      adaptations: { 1: 'The teacher reads aloud and students raise a hand when they hear a word that sounds familiar.', 2: 'Students circle cognates in a short, highlighted list.', 3: 'Students find cognates in a full paragraph and sort true and false cognates.', 4: 'Students explain how cognates helped them understand a hard sentence.' },
      check: 'Count true cognates found and ask one student to use a cognate to explain the text.',
      materials: 'Short text, bilingual dictionary', credit: 'Cognate instruction (Carlo et al., 2004)'
    }),
    A({
      id: 'preview-view-review', name: 'Preview–View–Review', category: 'assets', domains: ['listening', 'reading', 'speaking'], grades: ['2-3', '4-5', '6-8', '9-12'], minutes: 20,
      group: 'Whole class, then same-language groups', quadrants: ['Q1', 'Q3'],
      purpose: 'Students preview the lesson in their home language, learn it in English, and review it in the home language, so they understand the content.',
      studentsWill: ['Preview the main idea in the home language', 'Learn the lesson in English', 'Review key ideas with peers in the home language and in English'],
      steps: ['Preview: give a short summary or video in the home language (or let same-language peers discuss the topic).', 'View: teach the lesson in English with visuals.', 'Review: same-language groups explain the key ideas, then share one idea in English.', 'Add key words in both languages to a word wall.'],
      example: 'Social studies, grade 5: students watch a 2-minute Spanish video on the water cycle, learn the lesson in English, then explain it in pairs.',
      frames: ['In my language, ___ means ___.', 'The main idea is ___.'],
      adaptations: { 1: 'The review is mostly in the home language; students say one key sentence in English.', 2: 'Students review with a bilingual word list.', 3: 'Students review in English and use the home language for hard ideas.', 4: 'Students help translate key ideas for newer classmates.' },
      check: 'Ask each group to explain the main idea in English.',
      materials: 'Home-language preview (summary or video), visuals', credit: 'Preview–view–review (Freeman & Freeman, 1998)'
    }),
    /* ---------- Quick checks ---------- */
    A({
      id: 'exit-ticket', name: 'Exit Ticket', category: 'checks', domains: ['writing', 'reading'], grades: ['2-3', '4-5', '6-8', '9-12'], minutes: 5,
      group: 'Individual', quadrants: ['Q1', 'Q2', 'Q3', 'Q4'],
      purpose: 'A short written answer at the end of class that shows who met the lesson goal.',
      studentsWill: ['Answer one or two questions about the lesson goal', 'Use a key word from the lesson', 'Rate their own understanding'],
      steps: ['Write one question that matches the lesson objective.', 'Students answer on a card or digital form in 3–5 minutes.', 'Sort answers into three piles: got it, almost, not yet.', 'Use the piles to plan small groups for the next class.'],
      example: 'Grade 7: "Use the word ‘evidence’ in a sentence about today’s text." plus a 1–3 confidence rating.',
      frames: ['Today I learned ___.', 'One question I still have is ___.'],
      adaptations: { 1: 'Draw and label, or choose from pictures.', 2: 'Complete a frame with a word bank.', 3: 'Write 1–2 sentences.', 4: 'Explain how today connects to yesterday.' },
      check: 'Count how many answers meet the goal. Under 80% → reteach to the class; otherwise, a small group.',
      materials: 'Index cards or a digital form', credit: 'Formative assessment (Wiliam, 2011)'
    }),
    A({
      id: 'whiteboard-check', name: 'Whiteboard Check', category: 'checks', domains: ['writing', 'speaking'], grades: ['2-3', '4-5', '6-8', '9-12'], minutes: 5,
      group: 'Whole class', quadrants: ['Q1', 'Q2', 'Q3', 'Q4'],
      purpose: 'All students answer at the same time on mini whiteboards, so the teacher sees the whole class at once.',
      studentsWill: ['Write a short answer on a mini whiteboard', 'Show it on the signal', 'Fix their answer after feedback'],
      steps: ['Ask a question with a short answer.', 'Students write for 30–60 seconds.', 'On "Show me", everyone holds up the board.', 'Give quick feedback and ask students with different answers to explain.'],
      example: 'Grade 8: "Write one linking word that shows contrast." Boards show however, but, although…',
      frames: ['My answer is ___ because ___.'],
      adaptations: { 1: 'Draw or choose A/B/C.', 2: 'Write one word or phrase.', 3: 'Write a full sentence.', 4: 'Write the answer and a reason.' },
      check: 'Scan the boards. Who needs a reteach right now?',
      materials: 'Mini whiteboards and markers', credit: 'All-student response (Wiliam, 2011)'
    })
  ];

  /* ---------- Lessons: grade band → quadrant → stage (12 weeks) ---------- */
  const ROUTES = {
    Q1: { focus: 'Build reading and writing, using strong oral language as the bridge.', domains: ['reading', 'writing'] },
    Q2: { focus: 'Consolidate academic language, transfer it to content classes, and prepare for exit.', domains: ['reading', 'writing', 'speaking'] },
    Q3: { focus: 'Build foundational language and literacy together, with a lot of structured talk.', domains: ['listening', 'speaking', 'reading', 'writing'] },
    Q4: { focus: 'Build academic listening and speaking, using strong reading and writing as the bridge.', domains: ['listening', 'speaking'] }
  };
  const STAGES = [
    { n: 1, name: 'Stage 1 · Build', line: 'Routines, a baseline, and core skills with strong scaffolds.' },
    { n: 2, name: 'Stage 2 · Strengthen', line: 'Longer texts and tasks, fewer frames.' },
    { n: 3, name: 'Stage 3 · Extend', line: 'Grade-level texts and more independent work.' },
    { n: 4, name: 'Stage 4 · Transfer', line: 'Content-area tasks and readiness for reclassification.' }
  ];
  // Each week = one weekly unit (3 sessions of 45 minutes). Status: planned · in-progress · ready.
  const W = (title, acts, goal) => ({ title, activities: acts, goal, status: 'planned' });
  const R = (title, acts, goal) => ({ title, activities: acts, goal, status: 'ready' });
  const lessons = {
    '6-8': {
      Q1: { 1: [
        R('Identifying text structures and signal words', ['word-sort', 'think-aloud-annotation'], 'Name five text structures and their signal words; baseline summary'),
        R('Main ideas, key details, and examples', ['get-the-gist', 'think-aloud-annotation'], 'Separate the main idea from details and examples'),
        R('Matching graphic organizers to text structures', ['think-aloud-annotation', 'word-sort'], 'Choose the organizer that fits a text and explain why'),
        R('Paraphrasing without changing meaning', ['say-it-then-write-it', 'partner-talk-moves'], 'Restate academic sentences in your own words'),
        R('Drafting structured informational summaries', ['get-the-gist', 'somebody-wanted-but-so'], 'Write a short summary with topic, cause, and result'),
        R('Synthesizing information across two texts', ['evidence-sort', 'exit-ticket'], 'Combine two texts; mid-cycle summary check'),
        R('Listening for topic, main idea, and key words', ['dictogloss', 'listen-and-draw'], 'Track the topic and key words in a spoken talk'),
        R('Tracking spoken signal words and transitions', ['dictogloss', 'partner-talk-moves'], 'Use spoken transitions to separate claims from evidence'),
        R('Selective two-column notes with symbols', ['preview-view-review', 'dictogloss'], 'Take short notes from a talk and retell from them'),
        R('Speaker purpose, reasons, and evidence', ['evidence-sort', 'four-corners'], 'Identify a speaker’s purpose, reasons, and evidence'),
        R('Inferring from tone and stress', ['partner-talk-moves', 'think-pair-share'], 'Infer meaning from tone and stress, with proof'),
        R('Synthesized listening and spoken retell', ['inside-outside-circle', 'exit-ticket'], 'Spoken retell; final summary check with the baseline rubric')
      ] },
      Q2: { 1: [
        W('Goals and exit criteria', ['vocabulary-rating', 'dialogue-journal'], 'Set personal goals from the exit criteria'),
        W('Academic words across subjects', ['frayer-model', 'word-sort'], 'Use content words in science and social studies writing'),
        W('Author’s purpose in complex texts', ['reciprocal-teaching', 'think-aloud-annotation'], 'Explain an author’s purpose with evidence'),
        W('Claim and counterclaim', ['four-corners', 'evidence-sort'], 'State a claim and a counterclaim'),
        W('Evidence quality and reasoning', ['evidence-sort', 'philosophical-chairs'], 'Explain why evidence is strong or weak'),
        W('Mid-cycle check: academic discussion', ['fishbowl-discussion', 'exit-ticket'], 'Recorded discussion with a speaking checklist'),
        W('Finding and citing sources', ['anticipation-guide', 'get-the-gist'], 'Paraphrase and cite two sources'),
        W('Argument essay: planning', ['claim-evidence-explain', 'say-it-then-write-it'], 'Plan an argument with claim, reasons, and counterclaim'),
        W('Argument essay: drafting with feedback', ['claim-evidence-explain', 'dialogue-journal'], 'Draft an argument essay'),
        W('Presenting an argument orally', ['philosophical-chairs', 'inside-outside-circle'], 'Present an argument in 2 minutes'),
        W('Writing in a content class', ['dictogloss', 'whiteboard-check'], 'Write an explanation for a science or social studies task'),
        W('Final portfolio and reflection', ['vocabulary-rating', 'exit-ticket'], 'Post-assessment: argument essay with the baseline rubric')
      ] },
      Q3: { 1: [
        W('Talk routines and baseline', ['think-pair-share', 'vocabulary-rating'], 'Baseline speaking and writing samples'),
        W('From everyday to academic words', ['frayer-model', 'cognate-detectives'], 'Use 10 key academic words in sentences'),
        W('Reading fluency routines', ['partner-reading', 'preview-view-review'], 'Read a short text aloud with fewer stops'),
        W('Who, what, where in short texts', ['get-the-gist', 'partner-reading'], 'Answer who, what, and where questions about a text'),
        W('Building sentences', ['say-it-then-write-it', 'word-sort'], 'Write simple and compound sentences'),
        W('Mid-cycle check: retell and write', ['somebody-wanted-but-so', 'exit-ticket'], 'Mid-cycle retell and short writing sample'),
        W('Describing with details', ['listen-and-draw', 'say-it-then-write-it'], 'Describe a picture or process with details'),
        W('Sequencing events', ['somebody-wanted-but-so', 'dictogloss'], 'Retell events in order with time words'),
        W('Asking and answering questions', ['partner-talk-moves', 'reciprocal-teaching'], 'Ask and answer questions about a text'),
        W('A short paragraph with a model', ['claim-evidence-explain', 'dialogue-journal'], 'Write a short paragraph from a model'),
        W('Fluency and expression', ['partner-reading', 'whiteboard-check'], 'Read with expression and retell'),
        W('Final retell, paragraph, and reflection', ['somebody-wanted-but-so', 'vocabulary-rating'], 'Post-assessment: retell and paragraph with the baseline rubric')
      ] },
      Q4: { 1: [
        W('Talk norms and baseline', ['think-pair-share', 'vocabulary-rating'], 'Baseline recorded speaking sample'),
        W('Listening for main ideas', ['dictogloss', 'listen-and-draw'], 'Retell the main idea of a short talk or video'),
        W('Talk moves: clarify and paraphrase', ['partner-talk-moves', 'inside-outside-circle'], 'Paraphrase a partner correctly'),
        W('Asking questions in a discussion', ['reciprocal-teaching', 'partner-talk-moves'], 'Ask follow-up questions in a discussion'),
        W('Oral summaries of a text', ['get-the-gist', 'inside-outside-circle'], 'Summarize a text out loud in 30 seconds'),
        W('Mid-cycle check: partner discussion', ['fishbowl-discussion', 'exit-ticket'], 'Recorded partner discussion with a checklist'),
        W('Giving and supporting opinions', ['four-corners', 'think-pair-share'], 'Give an opinion with two reasons'),
        W('Structured debate', ['philosophical-chairs', 'four-corners'], 'Respond to another speaker before giving a new idea'),
        W('Listening to a speaker critically', ['dictogloss', 'fishbowl-discussion'], 'Identify a speaker’s claim and evidence'),
        W('Planning a short presentation', ['say-it-then-write-it', 'listen-and-draw'], 'Plan a 2-minute talk with notes'),
        W('Presenting with visuals', ['inside-outside-circle', 'whiteboard-check'], 'Rehearse and present with a visual'),
        W('Final presentation and reflection', ['fishbowl-discussion', 'vocabulary-rating'], 'Post-assessment: recorded presentation with the baseline checklist')
      ] }
    },
    '9-12': {
      Q1: { 1: [
        R('Text structures in academic texts', ['think-aloud-annotation', 'anticipation-guide'], 'Identify five structures in academic texts; baseline summary'),
        R('Central ideas and supporting evidence', ['get-the-gist', 'evidence-sort'], 'Separate a central idea from supporting evidence'),
        R('Graphic organizers for complex texts', ['think-aloud-annotation', 'frayer-model'], 'Build an organizer that keeps the text’s relationships'),
        R('Paraphrasing academic language', ['say-it-then-write-it', 'partner-talk-moves'], 'Restate complex sentences without changing meaning'),
        R('Writing objective summaries', ['get-the-gist', 'claim-evidence-explain'], 'Write a neutral summary without opinions'),
        R('Synthesizing two sources', ['evidence-sort', 'exit-ticket'], 'Combine two sources; mid-cycle summary check'),
        R('Listening to lectures: topic and key terms', ['dictogloss', 'preview-view-review'], 'Track the topic and key terms in a lecture'),
        R('Tracking lecture transitions and signposts', ['dictogloss', 'partner-talk-moves'], 'Use signposts to follow a lecture’s plan'),
        R('Cornell notes from a lecture', ['preview-view-review', 'dictogloss'], 'Take Cornell notes and write cue questions'),
        R('Speaker claim, reasons, and evidence', ['evidence-sort', 'philosophical-chairs'], 'Judge whether a speaker’s evidence is sufficient'),
        R('Inferring stance from tone and word choice', ['partner-talk-moves', 'fishbowl-discussion'], 'Infer a speaker’s stance and prove it'),
        R('Synthesized listening and academic retell', ['inside-outside-circle', 'exit-ticket'], 'Academic retell; final summary check with the baseline rubric')
      ] }
    }
  };

  /* ---------- Unit materials: workbook (PDF) and lesson slides (Google Slides, copy-only links) ---------- */
  const copy = id => 'https://docs.google.com/presentation/d/' + id + '/copy';
  const units = {
    '6-8': { Q1: { 1: {
      title: 'Read for Structure, Listen to Infer',
      about: 'A 12-week Stage 1 route for grades 6–8 learners who speak and listen well but read and write below grade level (Q1, oral dominant). Weeks 1–6 build academic reading and summary writing; weeks 7–12 build academic listening, using students’ oral strengths as a bridge. Each week has 3 sessions of 45 minutes. Weeks 1, 6, and 12 use the same summary task and the same 8-point rubric, so you can measure growth.',
      workbook: 'Read_for_Structure_Listen_to_Infer_DIALD.pdf', word: 'Read_for_Structure_Listen_to_Infer_DIALD.docx', pages: 44,
      slides: ['12zpz1395MXIEdoydby94BMOJyKhUX8Wu1ukkTnACws8', '1arcn6gLKhzKiKqMXCVwakeBy29LIAiv7vn6CfP3Wjwo', '1UCqwhWrWLlSJjDd1u--ovkjx84du1bn_S_45cU3hOUw',
        '1y6cDJaCVRsUprFydEME4pVXKsw1YobftIdGgv3MjP4Y', '1P5gltm51JVgcxnwZCSAqVCTRXz9-8vR7onNPr_SMjHk', '1XVOKXg2Uj5bt8OGOBiehRxKS8l0QhLFNDHnJtdVoDZ4',
        '1VuswaXWg8R9XN3Vp99McEPZ_pbxopPyriWPCYCokKSI', '1LRrHLsqFeL6ArVP2LcE7rc4Vun_ZCAdYgIuJkAqX2Ic', '1yyCjOn13Y2pbK21ov4cOQQbLN5gx1PgZimB6CAA0OIU',
        '1olWiJ50vbSxZFa0O2x9M-udt8zVCEPD8TkNJW_xm4mc', '1FhXYIVBTyriUz0_Ovgn3IYZTuc0SnBOUZ6HwIwGOKUg', '1n993EMvPQwhIcKgnFg_cnCPMcyY3LCu2LPX_jDWTovE'].map(copy)
    } } },
    '9-12': { Q1: { 1: {
      title: 'Read to Analyze, Listen to Synthesize',
      about: 'A 12-week Stage 1 route for high school learners who speak and listen well but read and write below grade level (Q1, oral dominant). Weeks 1–6 build academic reading and objective summaries; weeks 7–12 build lecture listening, Cornell notes, and synthesis. Each week has 3 sessions of 45 minutes. Weeks 1, 6, and 12 use the same summary task and the same 8-point rubric, so you can measure growth.',
      workbook: 'Read_to_Analyze_Listen_to_Synthesize_DIALD.pdf', word: 'Read_to_Analyze_Listen_to_Synthesize_DIALD.docx', pages: 47,
      slides: ['1lT7q4Ev9_vJEgeuywznHoKt5DiiZOdVgCSDW53oA6Oo', '1fF6zRgJ3KlF8B8aqGZnPzv-N845bToAMlH-Tu3YZVVc', '1-oPzqdDpjT7xC491rC1GpFz92vciW4n_VsOQW3Sqo8E',
        '1oZt3GdVzkNEx3xPDzJDQ3mKyPhZdUESSwO9TGCJBDDI', '1IN0UTOwXdupvznMICTAsM-aWjmA9nBRqcUUNOI-sdNE', '1A79LdVnZZcXzr4XnWwPNsWISenSHaeAuILLE9NjcVwo',
        '1oFtW_VjYzSSGqNwFJP_KQEVKdshpmFZR-VUxP5X-qpo', '1NFFOi_2yZwHtQNca9dOXjE1x8g6Pkz0AunyERS0HRyg', '1qs70iPVEFtdxfyp0Qx3wmD4VS3dBw3m_33T20FE61nY',
        '1vaUW-R6yviD3oPvyjW_fMrn3TPQK-DBZ0zYU2wKlndo', '1FLko9PcOLqQaq1tZYeB0wDrh-9ftqvUa7uLo6oPiUDs', '1iCxaofW4zIa507uav2tnIAKJEyHS5iVKhMCvoYK-Zxw'].map(copy)
    } } }
  };

  /* ---------- Push-in strategies (co-teaching with content teachers) ---------- */
  const pushin = [
    { name: 'One teach, one assist', line: 'The content teacher leads; the ESL teacher moves around and gives language support in the moment (frames, key words, clarifying).', when: 'Short lessons, or when the ESL teacher is new to the class.' },
    { name: 'Station teaching', line: 'The class rotates through stations. The ESL teacher runs one station on the language of the lesson.', when: 'Lessons with several parts; practice days.' },
    { name: 'Parallel teaching', line: 'The class is split in two and both teachers teach the same lesson; the ESL group gets more talk time and visuals.', when: 'Discussions and reviews where smaller groups help everyone speak.' },
    { name: 'Alternative teaching', line: 'The ESL teacher pre-teaches or reteaches a small group (vocabulary, a frame, a model) while the class continues.', when: 'Before a hard text or writing task; after an exit ticket shows a gap.' },
    { name: 'Team teaching', line: 'Both teachers lead together: one models the content, the other models the academic language out loud.', when: 'When both teachers have planned together.' }
  ];

  // Older sample pathways (still used by "Instructional Focus" in Learner Trajectory).
  const pathways = [
    {
      id: 'guided-reading-comprehension', title: 'Guided Reading Comprehension', status: 'sample',
      skill: 'Understand and explain grade-level texts', quadrants: ['Q1', 'Q3'], domains: ['reading'],
      grades: ['4-5', '6-8', '9-12'], weeks: 8,
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
      grades: ['4-5', '6-8', '9-12'], weeks: 8,
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
      grades: ['2-3', '4-5', '6-8', '9-12'], weeks: 6,
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

  const api = { CATEGORIES, GRADES, BANDS, activities, pathways, ROUTES, STAGES, lessons, units, pushin };
  if (typeof module !== 'undefined') module.exports = api;
  root.DIALDLibrary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
