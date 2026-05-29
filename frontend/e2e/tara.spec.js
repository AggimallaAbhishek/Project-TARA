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

async function mockApi(page, { authenticated = true, onDelete = () => {} } = {}) {
  await page.route('**/health', (route) => fulfillJson(route, { status: 'healthy' }));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/auth/config') {
      return fulfillJson(route, { google_client_id: 'e2e-client' });
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
  await page.getByLabel('Analysis Title').fill('E2E Text Analysis');
  await page.getByLabel('System Architecture Description').fill('Gateway, auth service, and database with external payments.');
  await page.getByRole('button', { name: 'Analyze System Threats' }).click();

  await expect(page).toHaveURL(/\/analysis\/101$/);
});

test('runs diagram and document upload flows', async ({ page }) => {
  await mockApi(page);

  await page.goto('/');
  await page.getByLabel('Analysis Title').fill('Diagram Analysis');
  await page.getByRole('button', { name: 'Upload Diagram' }).click();
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
  await page.getByRole('button', { name: 'Upload Document' }).click();
  await page.getByLabel('Upload Document').setInputFiles({
    name: 'architecture.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Document architecture with gateway, auth service, and database.'),
  });
  await page.getByRole('button', { name: 'Analyze Document Threats' }).click();
  await expect(page).toHaveURL(/\/analysis\/303$/);
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
