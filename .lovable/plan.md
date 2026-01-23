
# Deal Status Change Workflow Enhancement

## Overview
This plan implements a status change workflow that requires reasons when changing deal statuses to "Lost", "Not Active", or "Paused", with an automatic resume feature for paused deals.

## Database Changes

### New Table: `deal_status_history`
Creates a new table to track all status changes with reasons:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference |
| deal_id | UUID | Deal reference |
| old_status_id | UUID | Previous status |
| new_status_id | UUID | New status |
| reason | TEXT | Reason for the change |
| resume_date | TIMESTAMP | Expected resume date (for Paused status) |
| changed_by | UUID | User who made the change |
| created_at | TIMESTAMP | When the change occurred |

### Add Column to `deals` Table
Add `status_resume_date` column to track when a paused deal should resume.

## New Components

### 1. `DealStatusChangeDialog.tsx`
A new dialog component that appears when changing deal status to Lost, Not Active, or Paused:

**Features:**
- Displays the status being changed to
- Required reason text field
- For "Paused" status: includes a date picker for expected resume date
- Confirm/Cancel buttons

**Props:**
```text
- open: boolean
- onOpenChange: function
- newStatus: { id, name }
- onConfirm: function(reason, resumeDate?)
- loading: boolean
```

### 2. Edge Function: `check-paused-deals`
A scheduled function that runs daily to check for deals that need to be resumed:

**Logic:**
1. Query deals where status = "Paused" AND resume_date <= today
2. For each deal:
   - Change status to "Active"
   - Log the automatic resume in status history
   - Create a notification for the assigned user

## Modified Components

### `ComprehensiveDealView.tsx`
**Changes:**
1. Add state for status change dialog visibility
2. Add pending status change state
3. Intercept status changes before save:
   - If new status is Lost, Not Active, or Paused → show dialog
   - Only proceed with save after reason is provided
4. On status change confirmation:
   - Save reason to `deal_status_history`
   - If Paused, save `status_resume_date` to deals table
5. Display status history in the deal view

### `DealInfo.tsx`
**Same changes as ComprehensiveDealView:**
1. Intercept status changes
2. Show dialog for reason
3. Save to history table

### `DealStatusesManager.tsx`
**Add column for status type:**
- Add `requires_reason` boolean field to identify which statuses need reasons
- Add `is_pause_status` boolean to identify the Paused status specifically

## User Flow

```text
1. User edits deal and changes status to "Lost"
                    |
                    v
2. Dialog appears: "Why is this deal being marked as Lost?"
                    |
                    v
3. User enters reason (required)
                    |
                    v
4. User clicks "Confirm Status Change"
                    |
                    v
5. System saves:
   - Updates deal.deal_status_id
   - Creates record in deal_status_history
   - Logs activity with reason
                    |
                    v
6. Status change complete with full audit trail
```

**For Paused Status:**
```text
1. User changes status to "Paused"
                    |
                    v
2. Dialog appears with:
   - Reason field (required)
   - Expected Resume Date field (required)
                    |
                    v
3. User fills both fields
                    |
                    v
4. System saves:
   - Updates deal.deal_status_id
   - Updates deal.status_resume_date
   - Creates record in deal_status_history
                    |
                    v
5. When resume date arrives:
   - Scheduled job changes status to "Active"
   - Creates notification for user
   - Logs automatic resume in history
```

## Reporting Integration
The `deal_status_history` table enables:
- Lost deal analysis (common reasons for losing deals)
- Pause pattern analysis
- Status change frequency tracking
- Time-in-status calculations

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/deals/DealStatusChangeDialog.tsx` | Dialog for status change with reason |
| `supabase/migrations/xxx_deal_status_history.sql` | Create history table and resume_date column |
| `supabase/functions/check-paused-deals/index.ts` | Scheduled function for auto-resume |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/deals/ComprehensiveDealView.tsx` | Add status change interception and dialog |
| `src/components/deals/DealInfo.tsx` | Add status change interception and dialog |
| `src/components/settings/DealStatusesManager.tsx` | Add requires_reason and is_pause_status fields |

## Technical Details

### Status Detection Logic
```typescript
const requiresReason = (statusName: string) => {
  const reasonRequiredStatuses = ['lost', 'not active', 'paused'];
  return reasonRequiredStatuses.some(s => 
    statusName.toLowerCase().includes(s)
  );
};

const isPauseStatus = (statusName: string) => {
  return statusName.toLowerCase().includes('paused');
};
```

### Auto-Resume Edge Function Schedule
The `check-paused-deals` function will be scheduled to run daily at midnight using a cron trigger, checking for any deals whose `status_resume_date` has passed.
