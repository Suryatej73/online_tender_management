# Module Guide: Document Management & Document Intelligence

## 1. Scope
Module 8 provides a centralized document architecture across all tenderX procurement phases:
- Tender RFPs, specifications, and BOQs
- Vendor compliance certificates (GST, PAN, incorporation)
- Technical and financial bid submissions
- Evaluation reports and scoring sheets
- Contract agreements and award letters

## 2. Document Lifecycle State Machine
```
[ INITIATED ] ──► [ UPLOADING ] ──► [ UPLOADED ]
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
            [ SCANNING ]                                    [ QUARANTINED ] (if threat)
                  │
                  ▼ (if clean)
          [ OCR_PROCESSING ]
                  │
                  ▼
          [ VERIFICATION ] ──► [ AVAILABLE ] (Terminal Ready State)
                  │
                  ▼ (if rejected)
            [ REJECTED ]
```

## 3. Immutability & Concurrency
- Historical versions can never be edited or deleted in-place.
- Version rollback creates a new version referencing historical bytes, ensuring a verifiable audit trail for auditors and legal inquiries.
- Concurrency during upload completion is handled via row-level PostgreSQL locking (`select_for_update()`).
