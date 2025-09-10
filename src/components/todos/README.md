# Universal To-Do System

## Overview
This is a standardized To-Do system that works across the entire platform.

## Components

### TodoForm
Universal form for creating to-dos. Auto-fills entity context.

```tsx
<TodoForm 
  entityType="contract" 
  entityId="123" 
  paymentTermId="456" // Optional for contracts
  onSuccess={() => {}} 
/>
```

### TodoList  
Displays to-dos with filtering and search.

```tsx
<TodoList 
  entityType="deal"
  entityId="123"
  showFilters={true}
  canEdit={true}
/>
```

### TodoWidget
Complete widget combining form and list.

```tsx
<TodoWidget 
  entityType="project"
  entityId="123" 
  canEdit={true}
  compact={false}
/>
```

## Usage Examples

### Add to any entity page:
```tsx
// Deal page
<TodoWidget entityType="deal" entityId={dealId} />

// Project page  
<TodoWidget entityType="project" entityId={projectId} />

// Customer page
<TodoWidget entityType="customer" entityId={customerId} />
```

## Features
- ✅ Universal entity linking
- ✅ Auto-context filling
- ✅ Consistent visualization 
- ✅ Advanced filtering
- ✅ Global dashboard
- ✅ Audit trail
- ✅ Multiple assignees support
- ✅ Configurable types with colors/icons