import { useState } from 'react'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { SpeciesComparator } from '../../components/SpeciesComparator'
import { Button } from '../../components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'

const species = speciesData as Species[]
const NONE = '__none__'

interface SpeciesComparePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// `SpeciesComparator` dotąd żył wyłącznie wewnątrz `LookalikesWarning` (automatyczne pary z
// `species.lookalikes`) - to jedyny nowy kod tutaj: wybór DOWOLNYCH dwóch gatunków z Atlasu,
// żeby porównać je obok siebie, niezależnie od tego czy są sobie "sobowtórami". Sekwencyjne
// okna (nie zagnieżdżone) - po wybraniu obu gatunków szuflada wyboru zamyka się i w jej miejsce
// otwiera się już istniejący Dialog porównywarki.
export function SpeciesComparePicker({ open, onOpenChange }: SpeciesComparePickerProps) {
  const [speciesAId, setSpeciesAId] = useState('')
  const [speciesBId, setSpeciesBId] = useState('')
  const speciesA = species.find((s) => s.id === speciesAId) ?? null
  const speciesB = species.find((s) => s.id === speciesBId) ?? null
  const bothSelected = speciesA != null && speciesB != null

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Porównaj gatunki</DrawerTitle>
            <DrawerDescription>Wybierz dwa dowolne gatunki, żeby zobaczyć je obok siebie.</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <label className="block text-sm">
              Pierwszy gatunek
              <Select
                value={speciesAId || NONE}
                onValueChange={(value) => setSpeciesAId(value == null || value === NONE ? '' : value)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-- wybierz --</SelectItem>
                  {species
                    .filter((s) => s.id !== speciesBId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nameCommon} ({s.nameLatin})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block text-sm">
              Drugi gatunek
              <Select
                value={speciesBId || NONE}
                onValueChange={(value) => setSpeciesBId(value == null || value === NONE ? '' : value)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-- wybierz --</SelectItem>
                  {species
                    .filter((s) => s.id !== speciesAId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nameCommon} ({s.nameLatin})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </label>
            <Button disabled={!bothSelected} onClick={() => onOpenChange(false)}>
              Porównaj
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {bothSelected && !open && (
        <SpeciesComparator
          speciesA={speciesA}
          speciesB={speciesB}
          open
          onOpenChange={(stillOpen) => {
            if (!stillOpen) {
              setSpeciesAId('')
              setSpeciesBId('')
            }
          }}
        />
      )}
    </>
  )
}
