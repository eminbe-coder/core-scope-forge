import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRecycleBin, DeletedItem } from '@/hooks/use-recycle-bin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  Building2, 
  Users, 
  MapPin, 
  Handshake, 
  CheckSquare, 
  FileText, 
  Target 
} from 'lucide-react';
import { format } from 'date-fns';

const RecycleBin = () => {
  const { deletedItems, loading, restoreItem, permanentlyDelete } = useRecycleBin();
  const [selectedItem, setSelectedItem] = useState<DeletedItem | null>(null);
  const [actionType, setActionType] = useState<'restore' | 'delete' | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'companies':
        return <Building2 className="h-4 w-4" />;
      case 'contacts':
        return <Users className="h-4 w-4" />;
      case 'sites':
        return <MapPin className="h-4 w-4" />;
      case 'deals':
        return <Handshake className="h-4 w-4" />;
      case 'todos':
        return <CheckSquare className="h-4 w-4" />;
      case 'contracts':
        return <FileText className="h-4 w-4" />;
      case 'projects':
        return <Target className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEntityName = (item: DeletedItem) => {
    const data = item.entity_data;
    return data?.name || data?.title || data?.first_name + ' ' + (data?.last_name || '') || 'Unknown Item';
  };

  const handleRestore = (item: DeletedItem) => {
    setSelectedItem(item);
    setActionType('restore');
  };

  const handlePermanentDelete = (item: DeletedItem) => {
    setSelectedItem(item);
    setActionType('delete');
  };

  const confirmAction = async () => {
    if (!selectedItem) return;

    try {
      if (actionType === 'restore') {
        await restoreItem(selectedItem.id);
      } else if (actionType === 'delete') {
        await permanentlyDelete(selectedItem.id);
      }
    } finally {
      setSelectedItem(null);
      setActionType(null);
    }
  };

  const entityTypes = [...new Set(deletedItems.map(item => item.entity_type))];
  
  const filteredItems = activeTab === 'all' 
    ? deletedItems 
    : deletedItems.filter(item => item.entity_type === activeTab);

  const getStatistics = () => {
    const stats = entityTypes.map(type => ({
      type,
      count: deletedItems.filter(item => item.entity_type === type).length
    }));
    return stats;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recycle Bin</h1>
            <p className="text-muted-foreground">
              Manage deleted items - restore or permanently delete them
            </p>
          </div>
          <Badge variant="secondary">
            {deletedItems.length} deleted items
          </Badge>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {getStatistics().map(stat => (
            <Card key={stat.type}>
              <CardContent className="p-4 flex items-center space-x-2">
                {getEntityIcon(stat.type)}
                <div>
                  <p className="text-sm font-medium capitalize">{stat.type}</p>
                  <p className="text-2xl font-bold">{stat.count}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Items ({deletedItems.length})</TabsTrigger>
            {entityTypes.map(type => (
              <TabsTrigger key={type} value={type} className="capitalize">
                {type} ({deletedItems.filter(item => item.entity_type === type).length})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Deleted Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading deleted items...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Trash2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No deleted items found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Deleted By</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getEntityIcon(item.entity_type)}
                              <span className="capitalize">{item.entity_type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{getEntityName(item)}</p>
                              {item.entity_data?.description && (
                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                  {item.entity_data.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">
                                {item.deleted_by_profile?.first_name} {item.deleted_by_profile?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.deleted_by_profile?.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {format(new Date(item.deleted_at), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(item.deleted_at), 'hh:mm a')}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestore(item)}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Restore
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handlePermanentDelete(item)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedItem && !!actionType} onOpenChange={() => {
        setSelectedItem(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {actionType === 'restore' ? 'Restore Item' : 'Permanently Delete Item'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'restore' ? (
                <>
                  Are you sure you want to restore "{selectedItem ? getEntityName(selectedItem) : ''}"? 
                  This will make the item active again and remove it from the recycle bin.
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete "{selectedItem ? getEntityName(selectedItem) : ''}"? 
                  This action cannot be undone and the item will be completely removed from the database.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={actionType === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {actionType === 'restore' ? 'Restore' : 'Permanently Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default RecycleBin;