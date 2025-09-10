# Universal To-Do System with Hierarchical Context

## Overview
This is a standardized To-Do system that works across the entire platform with context-aware filtering and hierarchical display. It automatically shows relevant todos from parent and child entities.

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
Displays to-dos with filtering and search. Can accept pre-fetched todos or fetch its own.

```tsx
<TodoList 
  todos={hierarchicalTodos} // Pre-fetched todos with hierarchy
  showFilters={true}
  canEdit={true}
/>
```

### TodoWidget
Complete widget combining form and list with hierarchical context awareness.

```tsx
<TodoWidget 
  entityType="project"
  entityId="123" 
  canEdit={true}
  compact={false}
  includeChildren={true} // Show todos from child entities
/>
```

## Hierarchical Context Examples

### Contract Page
Shows contract todos + all payment term todos:
```tsx
<TodoWidget entityType="contract" entityId={contractId} />
// Result: Contract todos + Payment 1 todos + Payment 2 todos + etc.
```

### Deal Page  
Shows deal todos + converted contract todos + payment term todos:
```tsx
<TodoWidget entityType="deal" entityId={dealId} />
// Result: Deal todos + Contract todos + Payment term todos
```

### Site Page
Shows site todos + linked deal todos + linked contract todos:
```tsx
<TodoWidget entityType="site" entityId={siteId} />
// Result: Site todos + Deal todos + Contract todos + Payment term todos
```

### Payment Term (Specific)
Shows only todos for that payment term:
```tsx
<TodoWidget 
  entityType="contract" 
  entityId={contractId}
  paymentTermId={paymentTermId}
  includeChildren={false}
/>
// Result: Only Payment 1 todos
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `entityType` | string | required | Entity type (contract, deal, site, project, etc.) |
| `entityId` | string | required | Entity ID |
| `paymentTermId` | string | optional | Specific payment term ID |
| `canEdit` | boolean | true | Allow creating/editing todos |
| `compact` | boolean | false | Compact view without filters |
| `includeChildren` | boolean | true | Include child entity todos |
| `onUpdate` | function | optional | Callback when todos change |

## Hierarchical Relationships

The system automatically follows these relationships:

- **Contract** → Payment Terms
- **Deal** → Contracts → Payment Terms  
- **Site** → Deals + Contracts → Payment Terms
- **Project** → Deal → Contracts → Payment Terms

## Todo Source Labels

Todos are automatically labeled with their source:
- Direct todos: "Contract", "Deal", "Site", etc.
- Payment todos: "Payment 1", "Payment 2", etc.
- Cross-entity: "Contract: ABC Corp", "Deal: XYZ Project"

## Features
- ✅ Universal entity linking
- ✅ Hierarchical context awareness
- ✅ Auto-context filling
- ✅ Consistent visualization 
- ✅ Advanced filtering
- ✅ Global dashboard
- ✅ Audit trail
- ✅ Multiple assignees support
- ✅ Configurable types with colors/icons
- ✅ Parent/child relationship traversal
- ✅ Context-aware badge labeling