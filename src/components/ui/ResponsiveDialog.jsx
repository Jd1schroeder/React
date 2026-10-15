import './ResponsiveDialog.css'

// Use mobileMode="page" for complex, scrollable workflows that should feel like a page on phone and tablet.
export function ResponsiveDialog({ ariaLabel, ariaLabelledBy, backdropClassName = '', children, dialogClassName = '', mobileMode = 'modal', onBackdropMouseDown }) {
  const mobileClassName = mobileMode === 'page' ? ' is-mobile-page' : ''
  return <div className={`responsive-dialog-backdrop${mobileClassName} ${backdropClassName}`.trim()} role="presentation" onMouseDown={onBackdropMouseDown}>
    <section className={`responsive-dialog${mobileClassName} ${dialogClassName}`.trim()} role="dialog" aria-modal="true" aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
      {children}
    </section>
  </div>
}
