import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HomePage from './HomePage'

describe('HomePage', () => {
  it('renders the product name and description', () => {
    render(<HomePage />)

    expect(
      screen.getByRole('heading', { name: 'Ledger Tactica' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('A data-driven tabletop army builder.'),
    ).toBeInTheDocument()
  })
})
