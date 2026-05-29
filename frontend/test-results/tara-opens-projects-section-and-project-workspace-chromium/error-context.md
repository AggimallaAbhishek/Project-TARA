# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tara.spec.js >> opens projects section and project workspace
- Location: e2e/tara.spec.js:375:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByRole('link', { name: /Compare/i })
Expected: "/compare?project_id=7"
Error: strict mode violation: getByRole('link', { name: /Compare/i }) resolved to 2 elements:
    1) <a href="/compare" data-discover="true" class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-text-secondary hover:text-text-primary hover:bg-dark-tertiary">…</a> aka getByRole('navigation').getByRole('link', { name: 'Compare' })
    2) <a data-discover="true" href="/compare?project_id=7">…</a> aka getByRole('main').getByRole('link', { name: 'Compare' })

Call log:
  - Expect "toHaveAttribute" with timeout 10000ms
  - waiting for getByRole('link', { name: /Compare/i })

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
      - link "Back to Projects" [ref=e47] [cursor=pointer]:
        - /url: /projects
        - img [ref=e48]
        - text: Back to Projects
      - generic [ref=e50]:
        - generic [ref=e51]:
          - generic [ref=e52]:
            - paragraph [ref=e53]: Project Workspace
            - heading "Payment Service" [level=1] [ref=e54]
            - paragraph [ref=e55]: Payment platform workspace
          - generic [ref=e56]:
            - link "New Analysis" [ref=e57] [cursor=pointer]:
              - /url: /?project_id=7
              - button "New Analysis" [ref=e58]:
                - img [ref=e59]
                - text: New Analysis
            - link "Compare" [ref=e60] [cursor=pointer]:
              - /url: /compare?project_id=7
              - button "Compare" [ref=e61]:
                - img [ref=e62]
                - text: Compare
        - generic [ref=e69]:
          - generic [ref=e70]:
            - paragraph [ref=e71]:
              - img [ref=e72]
              - text: Analyses
            - paragraph [ref=e75]: "2"
          - generic [ref=e76]:
            - paragraph [ref=e77]:
              - img [ref=e78]
              - text: High/Critical
            - paragraph [ref=e80]: "1"
          - generic [ref=e81]:
            - paragraph [ref=e82]:
              - img [ref=e83]
              - text: Threats
            - paragraph [ref=e85]: "2"
          - generic [ref=e86]:
            - paragraph [ref=e87]:
              - img [ref=e88]
              - text: Latest
            - paragraph [ref=e90]: 1/2/2026
      - generic [ref=e91]:
        - generic [ref=e92]:
          - generic [ref=e93]:
            - heading "Project Analyses" [level=2] [ref=e94]
            - link "Open global history" [ref=e95] [cursor=pointer]:
              - /url: /history
          - link "Payment Service 1/1/2026 0.4s 1 threats 16.0 Score Critical" [ref=e96] [cursor=pointer]:
            - /url: /analysis/42
            - generic [ref=e97]:
              - generic [ref=e98]:
                - heading "Payment Service" [level=3] [ref=e99]
                - generic [ref=e100]:
                  - generic [ref=e101]:
                    - img [ref=e102]
                    - text: 1/1/2026
                  - generic [ref=e104]:
                    - img [ref=e105]
                    - text: 0.4s
                  - generic [ref=e108]: 1 threats
              - generic [ref=e109]:
                - generic [ref=e110]:
                  - generic [ref=e111]: "16.0"
                  - generic [ref=e112]: Score
                - generic [ref=e113]: Critical
          - link "Inventory Core 1/2/2026 0.3s 1 threats 8.0 Score Medium" [ref=e114] [cursor=pointer]:
            - /url: /analysis/43
            - generic [ref=e115]:
              - generic [ref=e116]:
                - heading "Inventory Core" [level=3] [ref=e117]
                - generic [ref=e118]:
                  - generic [ref=e119]:
                    - img [ref=e120]
                    - text: 1/2/2026
                  - generic [ref=e122]:
                    - img [ref=e123]
                    - text: 0.3s
                  - generic [ref=e126]: 1 threats
              - generic [ref=e127]:
                - generic [ref=e128]:
                  - generic [ref=e129]: "8.0"
                  - generic [ref=e130]: Score
                - generic [ref=e131]: Medium
        - generic [ref=e133]:
          - heading "Activity" [level=2] [ref=e134]
          - generic [ref=e136]:
            - img [ref=e138]
            - generic [ref=e139]:
              - paragraph [ref=e140]: Analysis created
              - paragraph [ref=e141]: Payment Service
              - paragraph [ref=e142]: 1/1/2026, 3:30:00 PM
```

# Test source

```ts
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
  364 |   await expect(page.getByText('Payment Service')).toBeVisible();
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
> 386 |   await expect(page.getByRole('link', { name: /Compare/i })).toHaveAttribute('href', '/compare?project_id=7');
      |                                                              ^ Error: expect(locator).toHaveAttribute(expected) failed
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