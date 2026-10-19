# Setup assistant (property setup wizard)

Shown once after "create a new business" in onboarding (`src/components/PropertySetupWizard.tsx`, wired in `OnboardingForm.tsx`). Invite joins skip it.

Steps: name + property type (pre-fills room counts only) → bedrooms/bathrooms/outdoor area → live checklist preview (`buildChecklistSections`) → optional calendar (iCal) link with platform label chips. Reuses `createProperty`, `updatePropertyProfile`, `addIcalFeed`.

A fixed sequence of questions, not a free-form chat; no AI call.
