import { expect, test } from '@playwright/test';

const user = {
  id: 1,
  email: 'e2e@example.com',
  name: 'E2E User',
  picture: null,
  created_at: '2026-01-01T00:00:00Z',
};

const analysis = {
  id: 42,
  project_id: 7,
  project: { id: 7, name: 'Payment Service' },
  title: 'Payment Service',
  system_description: 'Gateway, auth service, payment API, PostgreSQL, and Redis cache.',
  created_at: '2026-01-01T10:00:00Z',
  total_risk_score: 16,
  analysis_time: 0.4,
  has_diagram: false,
  diagram_format: null,
  diagram_code: null,
  threats: [
    {
      id: 1,
      analysis_id: 42,
      name: 'Session spoofing',
      description: 'Attacker can replay weak session tokens.',
      stride_category: 'Spoofing',
      affected_component: 'Auth Gateway',
      risk_level: 'Critical',
      likelihood: 4,
      impact: 4,
      risk_score: 16,
      mitigation: '1. Rotate tokens.\n2. Bind sessions to devices.',
      created_at: '2026-01-01T10:00:00Z',
    },
  ],
};

const umlAnalysis = {
  ...analysis,
  id: 404,
  title: 'UML Code Analysis',
  has_diagram: true,
  diagram_format: 'mermaid',
  diagram_code: 'graph TD\nClient[Browser] --> API[Gateway]\nAPI --> DB[(Database)]',
};

const analysesList = [
  {
    id: 42,
    project_id: 7,
    project: { id: 7, name: 'Payment Service' },
    title: 'Payment Service',
    created_at: '2026-01-01T10:00:00Z',
    total_risk_score: 16,
    threat_count: 1,
    high_risk_count: 1,
    analysis_time: 0.4,
  },
  {
    id: 43,
    project_id: 7,
    project: { id: 7, name: 'Payment Service' },
    title: 'Inventory Core',
    created_at: '2026-01-02T10:00:00Z',
    total_risk_score: 8,
    threat_count: 1,
    high_risk_count: 0,
    analysis_time: 0.3,
  },
];

const project = {
  id: 7,
  user_id: 1,
  name: 'Payment Service',
  description: 'Payment platform workspace',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T10:00:00Z',
  analysis_count: 2,
  latest_analysis_id: 43,
  latest_analysis_title: 'Inventory Core',
  latest_analysis_at: '2026-01-02T10:00:00Z',
  latest_risk_score: 8,
  total_threat_count: 2,
  high_risk_count: 1,
};

const comparisonPayload = {
  analyses: [
    {
      id: 42,
      title: 'Payment Service',
      created_at: '2026-01-01T10:00:00Z',
      total_risk_score: 16,
      threat_count: 1,
      average_risk_score: 16,
      max_risk_score: 16,
      risk_distribution: { Critical: 1, High: 0, Medium: 0, Low: 0 },
      stride_distribution: {
        Spoofing: 1,
        Tampering: 0,
        Repudiation: 0,
        'Information Disclosure': 0,
        'Denial of Service': 0,
        'Elevation of Privilege': 0,
      },
      threats_by_stride: {
        Spoofing: [analysis.threats[0]],
        Tampering: [],
        Repudiation: [],
        'Information Disclosure': [],
        'Denial of Service': [],
        'Elevation of Privilege': [],
      },
    },
    {
      id: 43,
      title: 'Inventory Core',
      created_at: '2026-01-02T10:00:00Z',
      total_risk_score: 8,
      threat_count: 1,
      average_risk_score: 8,
      max_risk_score: 8,
      risk_distribution: { Critical: 0, High: 0, Medium: 1, Low: 0 },
      stride_distribution: {
        Spoofing: 0,
        Tampering: 1,
        Repudiation: 0,
        'Information Disclosure': 0,
        'Denial of Service': 0,
        'Elevation of Privilege': 0,
      },
      threats_by_stride: {
        Spoofing: [],
        Tampering: [
          {
            ...analysis.threats[0],
            id: 2,
            name: 'Inventory tampering',
            stride_category: 'Tampering',
            risk_level: 'Medium',
            risk_score: 8,
          },
        ],
        Repudiation: [],
        'Information Disclosure': [],
        'Denial of Service': [],
        'Elevation of Privilege': [],
      },
    },
  ],
  cross_analysis: {
    total_unique_components: 2,
    total_unique_threat_names: 2,
    common_threats: [],
    unique_threats_per_analysis: { 42: ['Session spoofing'], 43: ['Inventory tampering'] },
    risk_trend: [
      {
        analysis_id: 42,
        title: 'Payment Service',
        created_at: '2026-01-01T10:00:00Z',
        total_risk_score: 16,
      },
      {
        analysis_id: 43,
        title: 'Inventory Core',
        created_at: '2026-01-02T10:00:00Z',
        total_risk_score: 8,
      },
    ],
  },
};

const auditLogs = [
  {
    id: 1,
    user_id: 1,
    analysis_id: 42,
    project_id: 7,
    action: 'analysis_created',
    event_metadata: { title: 'Payment Service' },
    created_at: '2026-01-01T10:00:00Z',
  },
  {
    id: 2,
    user_id: 1,
    analysis_id: 42,
    project_id: 7,
    action: 'pdf_exported',
    event_metadata: { title: 'Payment Service' },
    created_at: '2026-01-02T10:00:00Z',
  },
];

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function captureConsoleIssues(page) {
  const messages = [];
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      messages.push({ type, text: message.text() });
    }
  });
  return messages;
}

async function tabUntilFocused(page, locator, maxTabs = 40) {
  for (let index = 0; index < maxTabs; index += 1) {
    const focused = await locator.evaluate((element) => element === document.activeElement);
    if (focused) {
      return;
    }
    await page.keyboard.press('Tab');
  }

  throw new Error('Failed to focus the target element using keyboard tab navigation.');
}

async function mockApi(
  page,
  {
    authenticated = true,
    onDelete = () => {},
    onDiagramRefresh = () => {},
  } = {},
) {
  await page.route('**/health', (route) => fulfillJson(route, { status: 'healthy' }));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/auth/config') {
      return fulfillJson(route, { google_client_id: '' });
    }
    if (path === '/api/auth/me') {
      return authenticated
        ? fulfillJson(route, user)
        : fulfillJson(route, { detail: 'Could not validate credentials' }, 401);
    }
    if (path === '/api/projects' && method === 'GET') {
      return fulfillJson(route, {
        items: [project],
        total: 1,
        skip: Number(url.searchParams.get('skip') || 0),
        limit: Number(url.searchParams.get('limit') || 50),
        has_more: false,
      });
    }
    if (path === '/api/projects' && method === 'POST') {
      return fulfillJson(route, { ...project, id: 8, name: 'Created Project', analysis_count: 0 }, 201);
    }
    if (path === '/api/projects/7' && method === 'GET') {
      return fulfillJson(route, project);
    }
    if (path === '/api/projects/7' && method === 'PATCH') {
      const requestBody = request.postDataJSON();
      return fulfillJson(route, {
        ...project,
        ...requestBody,
      });
    }
    if (path === '/api/projects/7/analyses' && method === 'GET') {
      return fulfillJson(route, {
        items: analysesList,
        total: analysesList.length,
        skip: Number(url.searchParams.get('skip') || 0),
        limit: Number(url.searchParams.get('limit') || 20),
        has_more: false,
      });
    }
    if (path === '/api/projects/7/activity' && method === 'GET') {
      return fulfillJson(route, [
        {
          id: 1,
          user_id: 1,
          project_id: 7,
          analysis_id: 42,
          action: 'analysis_created',
          event_metadata: { title: 'Payment Service' },
          created_at: '2026-01-01T10:00:00Z',
        },
      ]);
    }
    if (path === '/api/analyze' && method === 'POST') {
      return fulfillJson(route, { ...analysis, id: 101, title: 'E2E Text Analysis' }, 201);
    }
    if (path === '/api/diagram/extract' && method === 'POST') {
      return fulfillJson(route, {
        extract_id: 'extract-1234',
        extracted_system_description: 'Extracted gateway, auth service, and database architecture.',
        source_metadata: {
          input_type: 'mermaid',
          file_name: 'diagram.mmd',
          file_size: 128,
          pages_processed: null,
          extractor_used: 'mermaid_parser_v1',
        },
      });
    }
    if (path === '/api/diagram/analyze' && method === 'POST') {
      return fulfillJson(route, { ...analysis, id: 202, title: 'Diagram Analysis' }, 201);
    }
    if (path === '/api/diagram/analyze-code' && method === 'POST') {
      return fulfillJson(route, umlAnalysis, 201);
    }
    if (path === '/api/document/analyze' && method === 'POST') {
      return fulfillJson(route, {
        analysis: { ...analysis, id: 303, title: 'Document Analysis' },
        version_comparison: {
          current_analysis_id: 303,
          current_created_at: '2026-01-03T10:00:00Z',
          previous_analysis_id: null,
          previous_created_at: null,
          has_previous_version: false,
          previous_total_issues: 0,
          resolved_issues_count: 0,
          unresolved_issues_count: 0,
          new_issues_count: 1,
          resolved_issues: [],
          unresolved_issues: [],
          new_issues: [],
        },
      }, 201);
    }
    if (path === '/api/compare' && method === 'POST') {
      return fulfillJson(route, comparisonPayload);
    }
    if (path === '/api/audit/logs' && method === 'GET') {
      return fulfillJson(route, auditLogs);
    }
    if (path.endsWith('/version-comparison')) {
      return fulfillJson(route, {
        current_analysis_id: 42,
        current_created_at: '2026-01-01T10:00:00Z',
        previous_analysis_id: null,
        previous_created_at: null,
        has_previous_version: false,
        previous_total_issues: 0,
        resolved_issues_count: 0,
        unresolved_issues_count: 0,
        new_issues_count: 1,
        resolved_issues: [],
        unresolved_issues: [],
        new_issues: [],
      });
    }
    if (path === '/api/analyses/42/summary') {
      return fulfillJson(route, {
        analysis_id: 42,
        title: 'Payment Service',
        total_threats: 3,
        critical_count: 1,
        high_count: 1,
        medium_count: 1,
        low_count: 0,
        average_risk_score: 10,
        max_risk_score: 16,
        stride_distribution: {
          Spoofing: 1,
          Tampering: 1,
          Repudiation: 0,
          'Information Disclosure': 1,
          'Denial of Service': 0,
          'Elevation of Privilege': 0,
        },
      });
    }
    if (path === '/api/analyses/404/summary') {
      return fulfillJson(route, {
        analysis_id: 404,
        title: 'UML Code Analysis',
        total_threats: 1,
        critical_count: 1,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        average_risk_score: 16,
        max_risk_score: 16,
        stride_distribution: {
          Spoofing: 1,
          Tampering: 0,
          Repudiation: 0,
          'Information Disclosure': 0,
          'Denial of Service': 0,
          'Elevation of Privilege': 0,
        },
      });
    }
    if (/^\/api\/analyses\/\d+\/summary$/.test(path)) {
      const analysisId = Number(path.split('/')[3]);
      return fulfillJson(route, {
        analysis_id: analysisId,
        title: `Analysis #${analysisId}`,
        total_threats: 1,
        critical_count: 0,
        high_count: 1,
        medium_count: 0,
        low_count: 0,
        average_risk_score: 8,
        max_risk_score: 8,
        stride_distribution: {
          Spoofing: 0,
          Tampering: 1,
          Repudiation: 0,
          'Information Disclosure': 0,
          'Denial of Service': 0,
          'Elevation of Privilege': 0,
        },
      });
    }
    if (path === '/api/analyses/42/export.pdf') {
      return route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: { 'Content-Disposition': 'attachment; filename="Payment-Service-42.pdf"' },
        body: '%PDF-1.4\n%e2e\n',
      });
    }
    if (path === '/api/analyses/42' && method === 'DELETE') {
      onDelete();
      return route.fulfill({ status: 204 });
    }
    if (path === '/api/analyses/404/diagram.svg') {
      if (url.searchParams.get('refresh') === 'true') {
        onDiagramRefresh();
      }
      return route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="140"><rect width="320" height="140" fill="#111"/><text x="12" y="72" fill="#0ff">UML Diagram</text></svg>',
      });
    }
    if (path === '/api/analyses/404/diagram.png') {
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: { 'Content-Disposition': 'attachment; filename="uml-code-analysis-404.png"' },
        body: Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'),
      });
    }
    if (path === '/api/analyses/404') {
      return fulfillJson(route, umlAnalysis);
    }
    if (path === '/api/analyses/42' || path === '/api/analyses/101' || path === '/api/analyses/202' || path === '/api/analyses/303') {
      return fulfillJson(route, analysis);
    }
    if (path === '/api/analyses' && method === 'GET') {
      return fulfillJson(route, {
        items: analysesList,
        total: analysesList.length,
        skip: Number(url.searchParams.get('skip') || 0),
        limit: Number(url.searchParams.get('limit') || 20),
        has_more: false,
      });
    }
    return fulfillJson(route, { detail: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}

test('redirects unauthenticated users from protected routes to login', async ({ page }) => {
  await mockApi(page, { authenticated: false });

  await page.goto('/history');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /Welcome to TARA/i })).toBeVisible();
});

test('shows landing at root and opens login when Sign In is clicked', async ({ page }) => {
  await mockApi(page, { authenticated: false });

  await page.goto('/welcome');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Project TARA/i })).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Project TARA/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /Welcome to TARA/i })).toBeVisible();
});

test('runs text analysis from the protected home page', async ({ page }) => {
  await mockApi(page);

  await page.goto('/');
  await expect(page.getByTestId('orbital-telemetry-header')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ORBITAL' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'MISSION INPUT' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
  await expect(page.getByLabel('New project name')).toHaveCount(0);

  await page.getByRole('button', { name: 'New Project' }).click();
  await expect(page.getByLabel('New project name')).toBeVisible();

  await page.getByLabel('Analysis Title').fill('E2E Text Analysis');
  await page.getByLabel('System Architecture Description').fill('Gateway, auth service, and database with external payments.');
  await page.getByRole('button', { name: 'Analyze System Threats' }).click();

  await expect(page).toHaveURL(/\/analysis\/101$/);
});

test('keeps home layout responsive without horizontal overflow across breakpoints', async ({ page }) => {
  await mockApi(page);

  const viewports = [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect(page.getByTestId('orbital-dashboard')).toBeVisible();
    await expect(page.getByTestId('orbital-telemetry-header')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ORBITAL' })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    expect(hasHorizontalOverflow).toBe(false);
  }
});

test('supports keyboard navigation to mission inputs on home', async ({ page }) => {
  await mockApi(page);

  await page.goto('/');
  await expect(page.getByLabel('Analysis Title')).toBeVisible();
  await expect(page.getByLabel('System Architecture Description')).toBeVisible();

  await tabUntilFocused(page, page.getByLabel('Analysis Title'));
  await page.keyboard.type('Keyboard Path Analysis');

  await tabUntilFocused(page, page.getByLabel('System Architecture Description'));
  await page.keyboard.type('Keyboard-only navigation reaches mission description input.');

  await expect(page.getByLabel('Analysis Title')).toHaveValue('Keyboard Path Analysis');
});

test('runs diagram and document upload flows', async ({ page }) => {
  await mockApi(page);

  await page.goto('/');
  await page.getByLabel('Analysis Title').fill('Diagram Analysis');
  await page.getByRole('button', { name: 'Upload File' }).click();
  await page.getByLabel('Upload Architecture Diagram').setInputFiles({
    name: 'diagram.mmd',
    mimeType: 'text/plain',
    buffer: Buffer.from('graph TD; A-->B;'),
  });
  await page.getByRole('button', { name: 'Extract Architecture' }).click();
  await expect(page.getByLabel('Review Extracted Architecture')).toHaveValue(/Extracted gateway/);
  await page.getByRole('button', { name: 'Analyze Diagram Threats' }).click();
  await expect(page).toHaveURL(/\/analysis\/202$/);

  await page.goto('/');
  await page.getByLabel('Analysis Title').fill('Document Analysis');
  await page.getByRole('button', { name: 'Upload File' }).click();
  await page.getByRole('button', { name: 'Document' }).click();
  await page.getByLabel('Upload Document').setInputFiles({
    name: 'architecture.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Document architecture with gateway, auth service, and database.'),
  });
  await page.getByRole('button', { name: 'Analyze Document Threats' }).click();
  await expect(page).toHaveURL(/\/analysis\/303$/);
});

test('runs UML code analysis and shows rendered diagram in analysis page', async ({ page }) => {
  const consoleIssues = captureConsoleIssues(page);
  let diagramRefreshSeen = false;
  await mockApi(page, { onDiagramRefresh: () => { diagramRefreshSeen = true; } });

  await page.goto('/');
  await page.getByLabel('Analysis Title').fill('UML Code Analysis');
  await page.getByRole('button', { name: 'UML Code' }).click();
  await page.getByLabel('UML Format').selectOption('mermaid');
  await page.getByLabel('UML Code').fill('graph TD\nClient[Browser] --> API[Gateway]\nAPI --> DB[(Database)]');
  await page.getByRole('button', { name: 'Analyze UML Threats' }).click();

  await expect(page).toHaveURL(/\/analysis\/404$/);
  await expect(page.getByText('Diagram (MERMAID)')).toBeVisible();
  await expect(page.getByAltText('UML Code Analysis UML diagram')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh Render Cache' })).toBeVisible();

  await page.getByRole('button', { name: 'Refresh Render Cache' }).click();
  await expect.poll(() => diagramRefreshSeen).toBe(true);

  await page.getByRole('button', { name: 'Show UML code' }).click();
  await expect(page.getByText(/Client\[Browser\]/)).toBeVisible();

  expect(consoleIssues).toEqual([]);
});

test('filters history and confirms analysis deletion', async ({ page }) => {
  let deleteCalled = false;
  await mockApi(page, { onDelete: () => { deleteCalled = true; } });

  await page.goto('/history');
  await expect(page.getByRole('link', { name: 'Payment Service' }).first()).toBeVisible();
  await page.getByLabel('Search analyses').fill('Payment');
  await page.getByLabel('Risk Level').selectOption('Critical');
  await page.getByLabel('STRIDE Category').selectOption('Spoofing');
  await page.getByLabel('Delete analysis Payment Service').click();
  await expect(page.getByText('Delete Analysis?')).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect.poll(() => deleteCalled).toBe(true);
});

test('opens projects section and project workspace', async ({ page }) => {
  await mockApi(page);

  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.getByText('Payment Service')).toBeVisible();

  await page.getByText('Payment Service').first().click();
  await expect(page).toHaveURL(/\/projects\/7$/);
  await expect(page.getByText('Project Workspace')).toBeVisible();
  await expect(page.getByText('Analysis created')).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: 'Compare' })).toHaveAttribute('href', '/compare?project_id=7');
});

test('edits project details inline from project workspace', async ({ page }) => {
  await mockApi(page);

  await page.goto('/projects/7');
  await expect(page.getByRole('heading', { level: 1, name: 'Payment Service' })).toBeVisible();

  await page.getByRole('button', { name: 'Edit Project' }).click();
  await page.getByLabel('Project Name').fill('Payment Service v2');
  await page.getByLabel('Project Description').fill('Updated workspace description for audit and analysis.');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('heading', { name: 'Payment Service v2' })).toBeVisible();
  await expect(page.getByText('Updated workspace description for audit and analysis.')).toBeVisible();
});

test('opens global audit page from navbar and displays logs', async ({ page }) => {
  await mockApi(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'Audit' }).click();

  await expect(page).toHaveURL(/\/audit$/);
  await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Analysis #42' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Project #7' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply Filters' })).toBeVisible();
});

test('downloads a PDF report from the analysis page', async ({ page }) => {
  await mockApi(page);

  await page.goto('/analysis/42');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF Report' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('Payment-Service-42.pdf');
});

test('compares selected analyses side-by-side', async ({ page }) => {
  const consoleIssues = captureConsoleIssues(page);
  await mockApi(page);

  await page.goto('/compare');
  await page.getByRole('button', { name: /Click to select analyses/i }).click();
  await page.getByRole('button', { name: /Payment Service/i }).click();
  await page.getByRole('button', { name: /Inventory Core/i }).click();
  await page.getByRole('button', { name: 'Compare' }).click();

  await expect(page.getByText('Risk Score Comparison')).toBeVisible();
  await expect(page.getByText('STRIDE Distribution Overlay')).toBeVisible();

  expect(consoleIssues).toEqual([]);
});
