# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tara.spec.js >> filters history and confirms analysis deletion
- Location: e2e/tara.spec.js:359:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Payment Service')
Expected: visible
Error: strict mode violation: getByText('Payment Service') resolved to 4 elements:
    1) <option value="7">Payment Service</option> aka getByLabel('Project')
    2) <a href="/analysis/42" data-discover="true" class="text-lg font-semibold text-text-primary hover:text-cyber-cyan transition-colors truncate block">Payment Service</a> aka getByRole('link', { name: 'Payment Service' }).first()
    3) <a href="/projects/7" data-discover="true" class="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/20 text-cyber-cyan text-xs hover:bg-cyber-cyan/20 transition-colors">…</a> aka getByRole('link', { name: 'Payment Service' }).nth(1)
    4) <a href="/projects/7" data-discover="true" class="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/20 text-cyber-cyan text-xs hover:bg-cyber-cyan/20 transition-colors">…</a> aka getByRole('link', { name: 'Payment Service' }).nth(3)

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('Payment Service')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - link "TARA logo TARA" [ref=e8] [cursor=pointer]:
          - /url: /
          - img "TARA logo" [ref=e9]
          - generic [ref=e10]: TARA
        - generic [ref=e11]:
          - link "Dashboard" [ref=e12] [cursor=pointer]:
            - /url: /
            - img [ref=e13]
            - text: Dashboard
          - link "Projects" [ref=e18] [cursor=pointer]:
            - /url: /projects
            - img [ref=e19]
            - text: Projects
          - link "History" [ref=e21] [cursor=pointer]:
            - /url: /history
            - img [ref=e22]
            - text: History
          - link "Compare" [ref=e26] [cursor=pointer]:
            - /url: /compare
            - img [ref=e27]
            - text: Compare
      - generic [ref=e34]:
        - generic [ref=e35]:
          - generic [ref=e37]: E
          - generic [ref=e38]: E2E User
        - button "Logout" [ref=e39] [cursor=pointer]:
          - img [ref=e40]
          - generic [ref=e43]: Logout
  - main [ref=e44]:
    - generic [ref=e45]:
      - generic [ref=e46]:
        - generic [ref=e47]:
          - heading "Analysis History" [level=1] [ref=e48]
          - paragraph [ref=e49]: 2 analyses found
        - link "New Analysis" [ref=e50] [cursor=pointer]:
          - /url: /
          - button "New Analysis" [ref=e51]:
            - img [ref=e52]
            - text: New Analysis
      - generic [ref=e53]:
        - generic [ref=e54]:
          - generic [ref=e55]: Search analyses
          - generic [ref=e56]:
            - img [ref=e57]
            - textbox "Search analyses" [ref=e60]:
              - /placeholder: Search by title
          - button "Apply Search" [ref=e61] [cursor=pointer]
        - generic [ref=e62]:
          - generic [ref=e63]:
            - generic [ref=e64]: Project
            - combobox "Project" [ref=e65]:
              - option "All" [selected]
              - option "Payment Service"
          - generic [ref=e66]:
            - generic [ref=e67]: Risk Level
            - combobox "Risk Level" [ref=e68]:
              - option "All" [selected]
              - option "Low"
              - option "Medium"
              - option "High"
              - option "Critical"
          - generic [ref=e69]:
            - generic [ref=e70]: STRIDE Category
            - combobox "STRIDE Category" [ref=e71]:
              - option "All" [selected]
              - option "Spoofing"
              - option "Tampering"
              - option "Repudiation"
              - option "Information Disclosure"
              - option "Denial of Service"
              - option "Elevation of Privilege"
          - generic [ref=e72]:
            - generic [ref=e73]: Date From
            - textbox "Date From" [ref=e74]
          - generic [ref=e75]:
            - generic [ref=e76]: Date To
            - textbox "Date To" [ref=e77]
        - generic [ref=e78]:
          - generic [ref=e79]: Showing 1-2 of 2
          - generic [ref=e80]:
            - generic [ref=e81]: Per page
            - combobox "Per page" [ref=e82]:
              - option "10"
              - option "20" [selected]
              - option "50"
            - button "Reset Filters" [disabled] [ref=e83]:
              - img [ref=e84]
              - text: Reset Filters
      - generic [ref=e87]:
        - generic [ref=e89]:
          - generic [ref=e90]:
            - link "Payment Service" [ref=e91] [cursor=pointer]:
              - /url: /analysis/42
            - link "Payment Service" [ref=e92] [cursor=pointer]:
              - /url: /projects/7
              - img [ref=e93]
              - text: Payment Service
            - generic [ref=e95]:
              - generic [ref=e96]:
                - img [ref=e97]
                - text: 1/1/2026
              - generic [ref=e99]:
                - img [ref=e100]
                - text: 0.4s
              - generic [ref=e103]:
                - img [ref=e104]
                - text: 1 threats
                - generic [ref=e106]: (1 high/critical)
          - generic [ref=e107]:
            - generic [ref=e108]:
              - generic [ref=e109]:
                - generic [ref=e110]: "16.0"
                - generic [ref=e111]: Score
              - generic [ref=e112]: Critical
            - generic [ref=e113]:
              - link "View analysis Payment Service" [ref=e114] [cursor=pointer]:
                - /url: /analysis/42
                - button "View analysis Payment Service" [ref=e115]:
                  - img [ref=e116]
              - button "Delete analysis Payment Service" [ref=e119] [cursor=pointer]:
                - img [ref=e120]
        - generic [ref=e124]:
          - generic [ref=e125]:
            - link "Inventory Core" [ref=e126] [cursor=pointer]:
              - /url: /analysis/43
            - link "Payment Service" [ref=e127] [cursor=pointer]:
              - /url: /projects/7
              - img [ref=e128]
              - text: Payment Service
            - generic [ref=e130]:
              - generic [ref=e131]:
                - img [ref=e132]
                - text: 1/2/2026
              - generic [ref=e134]:
                - img [ref=e135]
                - text: 0.3s
              - generic [ref=e138]:
                - img [ref=e139]
                - text: 1 threats
          - generic [ref=e141]:
            - generic [ref=e142]:
              - generic [ref=e143]:
                - generic [ref=e144]: "8.0"
                - generic [ref=e145]: Score
              - generic [ref=e146]: Medium
            - generic [ref=e147]:
              - link "View analysis Inventory Core" [ref=e148] [cursor=pointer]:
                - /url: /analysis/43
                - button "View analysis Inventory Core" [ref=e149]:
                  - img [ref=e150]
              - button "Delete analysis Inventory Core" [ref=e153] [cursor=pointer]:
                - img [ref=e154]
        - generic [ref=e157]:
          - button "Previous" [disabled] [ref=e158]:
            - img [ref=e159]
            - text: Previous
          - generic [ref=e161]: Page 1 of 1
          - button "Next" [disabled] [ref=e162]:
            - text: Next
            - img [ref=e163]
```

# Test source

```ts
  264 |     if (path === '/api/compare' && method === 'POST') {
  265 |       return fulfillJson(route, comparisonPayload);
  266 |     }
  267 |     if (path.endsWith('/version-comparison')) {
  268 |       return fulfillJson(route, {
  269 |         current_analysis_id: 42,
  270 |         current_created_at: '2026-01-01T10:00:00Z',
  271 |         previous_analysis_id: null,
  272 |         previous_created_at: null,
  273 |         has_previous_version: false,
  274 |         previous_total_issues: 0,
  275 |         resolved_issues_count: 0,
  276 |         unresolved_issues_count: 0,
  277 |         new_issues_count: 1,
  278 |         resolved_issues: [],
  279 |         unresolved_issues: [],
  280 |         new_issues: [],
  281 |       });
  282 |     }
  283 |     if (path === '/api/analyses/42/export.pdf') {
  284 |       return route.fulfill({
  285 |         status: 200,
  286 |         contentType: 'application/pdf',
  287 |         headers: { 'Content-Disposition': 'attachment; filename="Payment-Service-42.pdf"' },
  288 |         body: '%PDF-1.4\n%e2e\n',
  289 |       });
  290 |     }
  291 |     if (path === '/api/analyses/42' && method === 'DELETE') {
  292 |       onDelete();
  293 |       return route.fulfill({ status: 204 });
  294 |     }
  295 |     if (path === '/api/analyses/42' || path === '/api/analyses/101' || path === '/api/analyses/202' || path === '/api/analyses/303') {
  296 |       return fulfillJson(route, analysis);
  297 |     }
  298 |     if (path === '/api/analyses' && method === 'GET') {
  299 |       return fulfillJson(route, {
  300 |         items: analysesList,
  301 |         total: analysesList.length,
  302 |         skip: Number(url.searchParams.get('skip') || 0),
  303 |         limit: Number(url.searchParams.get('limit') || 20),
  304 |         has_more: false,
  305 |       });
  306 |     }
  307 |     return fulfillJson(route, { detail: `Unhandled mock route: ${method} ${path}` }, 500);
  308 |   });
  309 | }
  310 | 
  311 | test('redirects unauthenticated users from protected routes to login', async ({ page }) => {
  312 |   await mockApi(page, { authenticated: false });
  313 | 
  314 |   await page.goto('/history');
  315 | 
  316 |   await expect(page).toHaveURL(/\/login$/);
  317 |   await expect(page.getByRole('heading', { name: /Welcome to TARA/i })).toBeVisible();
  318 | });
  319 | 
  320 | test('runs text analysis from the protected home page', async ({ page }) => {
  321 |   await mockApi(page);
  322 | 
  323 |   await page.goto('/');
  324 |   await page.getByLabel('Analysis Title').fill('E2E Text Analysis');
  325 |   await page.getByLabel('System Architecture Description').fill('Gateway, auth service, and database with external payments.');
  326 |   await page.getByRole('button', { name: 'Analyze System Threats' }).click();
  327 | 
  328 |   await expect(page).toHaveURL(/\/analysis\/101$/);
  329 | });
  330 | 
  331 | test('runs diagram and document upload flows', async ({ page }) => {
  332 |   await mockApi(page);
  333 | 
  334 |   await page.goto('/');
  335 |   await page.getByLabel('Analysis Title').fill('Diagram Analysis');
  336 |   await page.getByRole('button', { name: 'Upload Diagram' }).click();
  337 |   await page.getByLabel('Upload Architecture Diagram').setInputFiles({
  338 |     name: 'diagram.mmd',
  339 |     mimeType: 'text/plain',
  340 |     buffer: Buffer.from('graph TD; A-->B;'),
  341 |   });
  342 |   await page.getByRole('button', { name: 'Extract Architecture' }).click();
  343 |   await expect(page.getByLabel('Review Extracted Architecture')).toHaveValue(/Extracted gateway/);
  344 |   await page.getByRole('button', { name: 'Analyze Diagram Threats' }).click();
  345 |   await expect(page).toHaveURL(/\/analysis\/202$/);
  346 | 
  347 |   await page.goto('/');
  348 |   await page.getByLabel('Analysis Title').fill('Document Analysis');
  349 |   await page.getByRole('button', { name: 'Upload Document' }).click();
  350 |   await page.getByLabel('Upload Document').setInputFiles({
  351 |     name: 'architecture.txt',
  352 |     mimeType: 'text/plain',
  353 |     buffer: Buffer.from('Document architecture with gateway, auth service, and database.'),
  354 |   });
  355 |   await page.getByRole('button', { name: 'Analyze Document Threats' }).click();
  356 |   await expect(page).toHaveURL(/\/analysis\/303$/);
  357 | });
  358 | 
  359 | test('filters history and confirms analysis deletion', async ({ page }) => {
  360 |   let deleteCalled = false;
  361 |   await mockApi(page, { onDelete: () => { deleteCalled = true; } });
  362 | 
  363 |   await page.goto('/history');
> 364 |   await expect(page.getByText('Payment Service')).toBeVisible();
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  365 |   await page.getByLabel('Search analyses').fill('Payment');
  366 |   await page.getByLabel('Risk Level').selectOption('Critical');
  367 |   await page.getByLabel('STRIDE Category').selectOption('Spoofing');
  368 |   await page.getByLabel('Delete analysis Payment Service').click();
  369 |   await expect(page.getByText('Delete Analysis?')).toBeVisible();
  370 |   await page.getByRole('button', { name: 'Delete', exact: true }).click();
  371 | 
  372 |   await expect.poll(() => deleteCalled).toBe(true);
  373 | });
  374 | 
  375 | test('opens projects section and project workspace', async ({ page }) => {
  376 |   await mockApi(page);
  377 | 
  378 |   await page.goto('/projects');
  379 |   await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  380 |   await expect(page.getByText('Payment Service')).toBeVisible();
  381 | 
  382 |   await page.getByText('Payment Service').first().click();
  383 |   await expect(page).toHaveURL(/\/projects\/7$/);
  384 |   await expect(page.getByText('Project Workspace')).toBeVisible();
  385 |   await expect(page.getByText('Analysis created')).toBeVisible();
  386 |   await expect(page.getByRole('link', { name: /Compare/i })).toHaveAttribute('href', '/compare?project_id=7');
  387 | });
  388 | 
  389 | test('downloads a PDF report from the analysis page', async ({ page }) => {
  390 |   await mockApi(page);
  391 | 
  392 |   await page.goto('/analysis/42');
  393 |   const downloadPromise = page.waitForEvent('download');
  394 |   await page.getByRole('button', { name: 'Download PDF Report' }).click();
  395 |   const download = await downloadPromise;
  396 | 
  397 |   expect(download.suggestedFilename()).toBe('Payment-Service-42.pdf');
  398 | });
  399 | 
  400 | test('compares selected analyses side-by-side', async ({ page }) => {
  401 |   await mockApi(page);
  402 | 
  403 |   await page.goto('/compare');
  404 |   await page.getByRole('button', { name: /Click to select analyses/i }).click();
  405 |   await page.getByRole('button', { name: /Payment Service/i }).click();
  406 |   await page.getByRole('button', { name: /Inventory Core/i }).click();
  407 |   await page.getByRole('button', { name: 'Compare' }).click();
  408 | 
  409 |   await expect(page.getByText('Risk Score Comparison')).toBeVisible();
  410 |   await expect(page.getByText('STRIDE Distribution Overlay')).toBeVisible();
  411 | });
  412 | 
```