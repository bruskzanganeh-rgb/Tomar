"use client"

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X, Music, Search } from 'lucide-react'
import { toast } from 'sonner'

type Work = {
  id: string
  title: string
  composer: string
  catalog_number: string | null
}

type GigWork = {
  id: string
  work_id: string
  conductor: string | null
  notes: string | null
  sort_order: number
  work: Work
}

type GigWorksProps = {
  gigId: string
  disabled?: boolean
}

export function GigWorks({ gigId, disabled }: GigWorksProps) {
  const [gigWorks, setGigWorks] = useState<GigWork[]>([])
  const [allWorks, setAllWorks] = useState<Work[]>([])
  const [composers, setComposers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [composerQuery, setComposerQuery] = useState('')
  const [showComposerSuggestions, setShowComposerSuggestions] = useState(false)
  const [newWork, setNewWork] = useState({
    title: '',
    composer: '',
  })
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null)
  const composerInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => {
    loadGigWorks()
    loadAllWorks()
  }, [gigId])

  async function loadGigWorks() {
    const { data } = await supabase
      .from('gig_works')
      .select(`
        id,
        work_id,
        conductor,
        notes,
        sort_order,
        work:works(id, title, composer, catalog_number)
      `)
      .eq('gig_id', gigId)
      .order('sort_order')

    setGigWorks((data || []) as unknown as GigWork[])
    setLoading(false)
  }

  async function loadAllWorks() {
    const { data } = await supabase
      .from('works')
      .select('id, title, composer, catalog_number')
      .order('composer')
      .order('title')

    if (data) {
      setAllWorks(data)
      // Extrahera unika kompositörer
      const uniqueComposers = [...new Set(data.map(w => w.composer))].sort()
      setComposers(uniqueComposers)
    }
  }

  // Filter works based on search query
  const filteredWorks = allWorks.filter(w => {
    const query = searchQuery.toLowerCase()
    return (
      w.title.toLowerCase().includes(query) ||
      w.composer.toLowerCase().includes(query) ||
      (w.catalog_number?.toLowerCase().includes(query) ?? false)
    )
  })

  // Filter composer suggestions
  const filteredComposers = composers.filter(c =>
    c.toLowerCase().includes(composerQuery.toLowerCase())
  )

  // Hitta verk av vald kompositör för att föreslå titlar
  const composerWorks = allWorks.filter(w =>
    w.composer.toLowerCase() === newWork.composer.toLowerCase()
  )

  async function addExistingWork() {
    if (!selectedWorkId) return

    const { error } = await supabase.from('gig_works').insert({
      gig_id: gigId,
      work_id: selectedWorkId,
      sort_order: gigWorks.length,
    })

    if (error) {
      if (error.code === '23505') {
        toast.warning('Detta verk är redan tillagt på denna gig')
      } else {
        console.error('Error adding work:', error)
        toast.error('Kunde inte lägga till verk')
      }
      return
    }

    setSelectedWorkId(null)
    setNewWork({ title: '', composer: '' })
    setShowAdd(false)
    setSearchQuery('')
    setComposerQuery('')
    loadGigWorks()
  }

  async function addNewWork() {
    if (!newWork.title || !newWork.composer) {
      toast.warning('Ange titel och kompositör')
      return
    }

    // First create the work
    const { data: createdWork, error: workError } = await supabase
      .from('works')
      .insert({
        title: newWork.title,
        composer: newWork.composer,
      })
      .select()
      .single()

    if (workError || !createdWork) {
      // Check if it's a duplicate
      if (workError?.code === '23505') {
        // Verket finns redan - hitta det och lägg till på gig
        const { data: existingWork } = await supabase
          .from('works')
          .select('id')
          .ilike('title', newWork.title)
          .ilike('composer', newWork.composer)
          .single()

        if (existingWork) {
          const { error: linkError } = await supabase.from('gig_works').insert({
            gig_id: gigId,
            work_id: existingWork.id,
            sort_order: gigWorks.length,
          })

          if (linkError) {
            if (linkError.code === '23505') {
              toast.warning('Detta verk är redan tillagt på denna gig')
            } else {
              console.error('Error linking work:', linkError)
              toast.error('Kunde inte lägga till verk')
            }
            return
          }

          setNewWork({ title: '', composer: '' })
          setShowAdd(false)
          loadGigWorks()
          return
        }
      }
      console.error('Error creating work:', workError)
      toast.error('Kunde inte skapa verk')
      return
    }

    // Then link it to the gig
    const { error: linkError } = await supabase.from('gig_works').insert({
      gig_id: gigId,
      work_id: createdWork.id,
      sort_order: gigWorks.length,
    })

    if (linkError) {
      console.error('Error linking work:', linkError)
    }

    setNewWork({ title: '', composer: '' })
    setComposerQuery('')
    setShowAdd(false)
    loadGigWorks()
    loadAllWorks()
  }

  async function removeWork(gigWorkId: string) {
    const { error } = await supabase
      .from('gig_works')
      .delete()
      .eq('id', gigWorkId)

    if (error) {
      console.error('Error removing work:', error)
      return
    }

    loadGigWorks()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Music className="h-4 w-4" />
          Program / Verk
        </Label>
        {!showAdd && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Lägg till
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Laddar...</p>
      ) : gigWorks.length === 0 && !showAdd ? (
        <p className="text-sm text-muted-foreground italic">Inga verk tillagda</p>
      ) : (
        <div className="space-y-2">
          {gigWorks.map((gw) => (
            <div
              key={gw.id}
              className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {gw.work.composer}: {gw.work.title}
                </p>
                {gw.work.catalog_number && (
                  <p className="text-xs text-muted-foreground">{gw.work.catalog_number}</p>
                )}
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeWork(gw.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="border rounded-lg p-3 space-y-3 bg-background">
          {/* Sök befintligt verk */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök verk (titel, kompositör)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedWorkId(null)
                }}
                className="h-8"
              />
            </div>

            {searchQuery && filteredWorks.length > 0 && (
              <div className="max-h-32 overflow-y-auto border rounded-md">
                {filteredWorks.slice(0, 8).map((work) => (
                  <button
                    key={work.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                      selectedWorkId === work.id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => {
                      setSelectedWorkId(work.id)
                      setSearchQuery(`${work.composer}: ${work.title}`)
                    }}
                  >
                    <span className="font-medium">{work.composer}</span>: {work.title}
                    {work.catalog_number && (
                      <span className="text-muted-foreground ml-1">({work.catalog_number})</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedWorkId && (
              <div className="flex gap-2 pt-2">
                <Button type="button" size="sm" onClick={addExistingWork}>
                  Lägg till
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAdd(false)
                    setSelectedWorkId(null)
                    setSearchQuery('')
                  }}
                >
                  Avbryt
                </Button>
              </div>
            )}
          </div>

          {/* Skapa nytt verk */}
          {!selectedWorkId && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground font-medium">Skapa nytt verk:</p>

              {/* Kompositör med autocomplete */}
              <div className="relative">
                <Input
                  ref={composerInputRef}
                  placeholder="Kompositör *"
                  value={newWork.composer}
                  onChange={(e) => {
                    setNewWork({ ...newWork, composer: e.target.value })
                    setComposerQuery(e.target.value)
                    setShowComposerSuggestions(true)
                  }}
                  onFocus={() => {
                    if (newWork.composer) {
                      setComposerQuery(newWork.composer)
                      setShowComposerSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => setShowComposerSuggestions(false), 150)
                  }}
                  className="h-8"
                />
                {showComposerSuggestions && composerQuery && filteredComposers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 max-h-32 overflow-y-auto border rounded-md bg-background shadow-lg">
                    {filteredComposers.slice(0, 5).map((composer) => (
                      <button
                        key={composer}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setNewWork({ ...newWork, composer })
                          setShowComposerSuggestions(false)
                        }}
                      >
                        {composer}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Titel med förslag från kompositörens verk */}
              <div className="relative">
                <Input
                  placeholder="Titel *"
                  value={newWork.title}
                  onChange={(e) => setNewWork({ ...newWork, title: e.target.value })}
                  className="h-8"
                />
                {newWork.composer && composerWorks.length > 0 && !newWork.title && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Har spelat: {composerWorks.slice(0, 3).map(w => w.title).join(', ')}
                    {composerWorks.length > 3 && ` +${composerWorks.length - 3} till`}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={addNewWork}
                  disabled={!newWork.title || !newWork.composer}
                >
                  Skapa & lägg till
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAdd(false)
                    setNewWork({ title: '', composer: '' })
                    setSearchQuery('')
                    setComposerQuery('')
                  }}
                >
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
