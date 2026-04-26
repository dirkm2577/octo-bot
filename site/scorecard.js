const questions = [
  {
    category: 'Credentials',
    text: 'Where are production secrets or API keys stored for this workflow?',
    options: [
      ['Managed secret store with limited access', 0],
      ['Platform environment variables with restricted access', 1],
      ['Workflow config, shared workspace, or copied between tools', 3],
      ['Unknown or visible to multiple people/tools', 4],
    ],
  },
  {
    category: 'Credentials',
    text: 'How are credentials rotated or revoked?',
    options: [
      ['Documented owner and tested rotation process', 0],
      ['Manual process exists but is not tested often', 1],
      ['Ad hoc rotation only after issues', 3],
      ['No known rotation or revocation process', 4],
    ],
  },
  {
    category: 'Permissions',
    text: 'What kind of systems can the workflow access?',
    options: [
      ['Read-only test or sandbox systems', 0],
      ['Read-only production systems', 1],
      ['Some production write access', 3],
      ['Broad write access across critical systems', 4],
    ],
  },
  {
    category: 'Permissions',
    text: 'How tightly scoped are the tool/API permissions?',
    options: [
      ['Least privilege, reviewed recently', 0],
      ['Mostly scoped, with a few broad permissions', 1],
      ['Broad scopes because setup was faster', 3],
      ['Admin/full-access credentials are used', 4],
    ],
  },
  {
    category: 'Approvals',
    text: 'Can the workflow send, update, delete, approve, or purchase anything?',
    options: [
      ['No, it only drafts or recommends', 0],
      ['Yes, but only low-impact internal changes', 1],
      ['Yes, customer-facing or production changes', 3],
      ['Yes, high-impact actions without clear limits', 4],
    ],
  },
  {
    category: 'Approvals',
    text: 'Which actions require explicit human approval?',
    options: [
      ['All meaningful write actions', 0],
      ['Most write actions, with a few exceptions', 1],
      ['Only some obvious actions', 3],
      ['No reliable approval gate', 4],
    ],
  },
  {
    category: 'Data Handling',
    text: 'What data can the workflow read?',
    options: [
      ['Non-sensitive or synthetic data only', 0],
      ['Limited business data', 1],
      ['Customer, financial, HR, legal, or private business data', 3],
      ['Sensitive data plus broad internal context', 4],
    ],
  },
  {
    category: 'Data Handling',
    text: 'Do prompts or logs store private payloads?',
    options: [
      ['Payloads are minimized or redacted', 0],
      ['Some payloads are stored for debugging', 1],
      ['Full payloads are often stored', 3],
      ['Unknown where prompts/logs are retained', 4],
    ],
  },
  {
    category: 'Audit Trail',
    text: 'Can you reconstruct what happened after a bad run?',
    options: [
      ['Yes: trigger, tool calls, approvals, and outputs are traceable', 0],
      ['Mostly, but some context is missing', 1],
      ['Only partial logs are available', 3],
      ['No reliable reconstruction path', 4],
    ],
  },
  {
    category: 'Audit Trail',
    text: 'Are failed tool calls and retries visible?',
    options: [
      ['Yes, including retry behavior and final state', 0],
      ['Visible in the platform but not reviewed regularly', 1],
      ['Hard to find or split across tools', 3],
      ['Unknown or not logged', 4],
    ],
  },
  {
    category: 'Recovery',
    text: 'Is there a fast kill switch or disable path?',
    options: [
      ['Yes, documented and accessible to the owner', 0],
      ['Yes, but only technical staff know it', 1],
      ['Possible, but slow or unclear', 3],
      ['No known kill switch', 4],
    ],
  },
  {
    category: 'Recovery',
    text: 'What prevents duplicate or repeated business actions?',
    options: [
      ['Idempotency, dedupe, or state checks are in place', 0],
      ['Some safeguards exist', 1],
      ['Mostly manual review catches duplicates', 3],
      ['Nothing clear prevents repeat actions', 4],
    ],
  },
  {
    category: 'Ownership',
    text: 'Who owns risk decisions for this workflow?',
    options: [
      ['Named business and technical owners', 0],
      ['One clear owner, but backup is unclear', 1],
      ['Shared responsibility across people/tools', 3],
      ['No named owner', 4],
    ],
  },
  {
    category: 'Ownership',
    text: 'How often is the workflow reviewed after changes?',
    options: [
      ['Every meaningful change or release', 0],
      ['Occasionally after major changes', 1],
      ['Only when something breaks', 3],
      ['Never or unknown', 4],
    ],
  },
  {
    category: 'Exposure',
    text: 'Who can modify the workflow configuration?',
    options: [
      ['Small controlled group with change history', 0],
      ['Small group, but weak change history', 1],
      ['Many workspace members', 3],
      ['Unknown or broad access', 4],
    ],
  },
];

const bands = [
  {
    min: 0,
    max: 14,
    label: 'Controlled',
    tone: 'low',
    summary: 'This workflow looks comparatively controlled. The next useful step is a light review of evidence, not a heavy audit.',
    action: 'Keep review cadence active and document the approval, logging, and recovery paths.',
  },
  {
    min: 15,
    max: 29,
    label: 'Watchlist',
    tone: 'medium',
    summary: 'There are real gaps, but they are probably fixable with a focused cleanup sprint.',
    action: 'Prioritize secret storage, permission scope, and approval gates before expanding the workflow.',
  },
  {
    min: 30,
    max: 44,
    label: 'Exposed',
    tone: 'high',
    summary: 'This workflow has enough access and uncertainty that a practical audit is justified before further rollout.',
    action: 'Map credentials, write actions, logging, and recovery before adding more tools or users.',
  },
  {
    min: 45,
    max: 60,
    label: 'Critical',
    tone: 'critical',
    summary: 'This workflow appears to combine broad access with weak controls. Treat it as an operational risk surface.',
    action: 'Pause expansion, add human approval gates, restrict credentials, and review logs/recovery immediately.',
  },
];

const questionList = document.querySelector('#question-list');
const form = document.querySelector('#risk-scorecard');
const resultPanel = document.querySelector('#score-result');
const formError = document.querySelector('#form-error');

function renderQuestions() {
  questionList.innerHTML = questions
    .map((question, index) => {
      const optionMarkup = question.options
        .map(([label, value], optionIndex) => {
          const id = `q-${index}-${optionIndex}`;
          return `
            <label class="option-pill" for="${id}">
              <input id="${id}" type="radio" name="q-${index}" value="${value}" data-category="${question.category}">
              <span>${label}</span>
            </label>
          `;
        })
        .join('');

      return `
        <fieldset class="question-card">
          <legend>
            <span>${question.category}</span>
            ${index + 1}. ${question.text}
          </legend>
          <div class="option-grid">${optionMarkup}</div>
        </fieldset>
      `;
    })
    .join('');
}

function getBand(score) {
  return bands.find((band) => score >= band.min && score <= band.max) ?? bands[bands.length - 1];
}

function getAnswers() {
  return questions.map((question, index) => {
    const selected = form.querySelector(`input[name="q-${index}"]:checked`);
    return {
      question: question.text,
      category: question.category,
      score: selected ? Number(selected.value) : null,
      answer: selected ? selected.nextElementSibling.textContent.trim() : '',
    };
  });
}

function buildMailto({ score, band, categoryScores, lead }) {
  const sortedCategories = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, categoryScore]) => `${category}: ${categoryScore}`)
    .join('\n');

  const body = encodeURIComponent([
    'Hi OctoBot Labs,',
    '',
    'We completed the AI Workflow Risk Scorecard and would like a mini-audit.',
    '',
    `Score: ${score}/60`,
    `Risk band: ${band.label}`,
    `Email: ${lead.email || 'Not provided'}`,
    `Company/project: ${lead.company || 'Not provided'}`,
    `Workflow: ${lead.workflow || 'Not provided'}`,
    '',
    'Highest scoring categories:',
    sortedCategories || 'Not available',
    '',
    'Please tell us what you need for the first review.',
  ].join('\n'));

  return `mailto:hello@octo-bot.io?subject=${encodeURIComponent(`AI Workflow Risk Score - ${band.label}`)}&body=${body}`;
}

function renderResult() {
  const answers = getAnswers();
  const missing = answers.filter((answer) => answer.score === null);

  if (missing.length > 0) {
    formError.textContent = `Answer all ${questions.length} questions before calculating your score.`;
    return;
  }

  formError.textContent = '';

  const categoryScores = answers.reduce((scores, answer) => {
    scores[answer.category] = (scores[answer.category] || 0) + answer.score;
    return scores;
  }, {});

  const score = answers.reduce((sum, answer) => sum + answer.score, 0);
  const band = getBand(score);
  const lead = {
    email: document.querySelector('#lead-email').value.trim(),
    company: document.querySelector('#lead-company').value.trim(),
    workflow: document.querySelector('#workflow-name').value.trim(),
  };
  const topCategories = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const mailto = buildMailto({ score, band, categoryScores, lead });

  resultPanel.className = `score-result score-result-ready score-${band.tone}`;
  resultPanel.innerHTML = `
    <p class="section-kicker">Result</p>
    <h2>${band.label}: ${score}/60</h2>
    <p>${band.summary}</p>
    <div class="score-meter" aria-label="Risk score ${score} out of 60">
      <span style="width: ${(score / 60) * 100}%"></span>
    </div>
    <div class="category-results">
      ${topCategories
        .map(([category, categoryScore]) => `<div><span>${category}</span><strong>${categoryScore}</strong></div>`)
        .join('')}
    </div>
    <h3>Recommended next step</h3>
    <p>${band.action}</p>
    <a class="button button-primary" href="${mailto}">Request a mini-audit</a>
  `;

  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

renderQuestions();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  renderResult();
});
