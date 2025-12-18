"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Tag, Edit, Trash2 } from 'lucide-react'
import { CreateGigTypeDialog } from '@/components/gig-types/create-gig-type-dialog'

type GigType = {
  id: string
  name: string
  vat_rate: number
  color: string | null
  default_description: string | null
  is_default: boolean
}

export default function GigTypesPage() {
  const [gigTypes, setGigTypes] = useState<GigType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadGigTypes()
  }, [])

  async function loadGigTypes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('gig_types')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error loading gig types:', error)
    } else {
      setGigTypes(data || [])
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Är du säker på att du vill ta bort denna uppdragstyp?')) {
      return
    }

    const { error } = await supabase
      .from('gig_types')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting gig type:', error)
      alert('Kunde inte ta bort uppdragstyp')
    } else {
      loadGigTypes()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Uppdragstyper</h1>
          <p className="text-muted-foreground">
            Hantera typer av uppdrag med olika momssatser
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ny uppdragstyp
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Alla uppdragstyper ({gigTypes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laddar...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>Momssats</TableHead>
                  <TableHead>Färg</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gigTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">
                      {type.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{type.vat_rate}%</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: type.color || '#gray' }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {type.color || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {type.is_default && (
                        <Badge variant="secondary">Standard</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={type.is_default}
                          onClick={() => handleDelete(type.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <CreateGigTypeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadGigTypes}
      />
    </div>
  )
}
