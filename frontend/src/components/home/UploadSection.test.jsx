import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'

import UploadSection from './UploadSection'

const baseProps = {
  uploadSource: 'diagram',
  onUploadSourceChange: vi.fn(),
  title: 'Architecture',
  diagramFile: null,
  documentFile: null,
  isExtracting: false,
  extractId: '',
  extractedDescription: '',
  sourceMetadata: null,
  onExtractedDescriptionChange: vi.fn(),
  onDiagramFileChange: vi.fn(),
  onDocumentFileChange: vi.fn(),
  onExtractDiagram: vi.fn(),
  diagramAcceptTypes: '.png,.jpg,.mmd',
  documentAcceptTypes: '.pdf,.txt',
  descriptionMaxLength: 5000,
}

function renderUploadSection(overrides = {}) {
  const props = {
    ...baseProps,
    onUploadSourceChange: vi.fn(),
    onExtractedDescriptionChange: vi.fn(),
    onDiagramFileChange: vi.fn(),
    onDocumentFileChange: vi.fn(),
    onExtractDiagram: vi.fn(),
    ...overrides,
  }

  return {
    props,
    ...render(<UploadSection {...props} />),
  }
}

describe('UploadSection', () => {
  it('passes dropped diagram files through the existing change handler shape', () => {
    const { props } = renderUploadSection()
    const diagramFile = new File(['graph TD; A-->B;'], 'architecture.mmd', {
      type: 'text/plain',
    })

    fireEvent.drop(screen.getByRole('button', { name: /drop a file here or browse/i }), {
      dataTransfer: {
        files: [diagramFile],
      },
    })

    expect(props.onDiagramFileChange).toHaveBeenCalledTimes(1)
    expect(props.onDiagramFileChange.mock.calls[0][0].target.files[0]).toBe(diagramFile)
  })

  it('shows diagram extraction and review progress states', () => {
    renderUploadSection({
      diagramFile: new File(['diagram'], 'architecture.png', { type: 'image/png' }),
      isExtracting: true,
    })

    const progress = screen.getByLabelText('Upload progress')

    expect(within(progress).getByText('Select file')).toBeInTheDocument()
    expect(within(progress).getByText('Extract')).toBeInTheDocument()
    expect(within(progress).getByText('In progress')).toBeInTheDocument()
    expect(within(progress).getAllByText('Pending')).toHaveLength(2)
  })

  it('marks document extraction and review as skipped', () => {
    renderUploadSection({
      uploadSource: 'document',
      documentFile: new File(['architecture'], 'architecture.txt', { type: 'text/plain' }),
    })

    const progress = screen.getByLabelText('Upload progress')

    expect(within(progress).getByText('Ready')).toBeInTheDocument()
    expect(within(progress).getAllByText('Done')).toHaveLength(2)
    expect(within(progress).getAllByText('Skipped')).toHaveLength(2)
  })
})
