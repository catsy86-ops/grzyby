import type { RefObject } from 'react'
import { DownloadIcon, FileTextIcon, MapIcon, MoreVerticalIcon, TableIcon, TrophyIcon, UploadIcon } from 'lucide-react'
import { Button } from '../../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'

// Wydzielone z JournalView.tsx (Faza 27, redukcja rozmiaru pliku) - nagłówkowy przycisk
// "Osiągnięcia" + menu eksportu/importu. Bez własnego stanu poza tym co JournalView przekazuje;
// `fileInputRef`/`onImportFile` zostają sterowane z rodzica, bo ukryty `<input type=file>` musi
// żyć w drzewie renderowanym niezależnie od tego, czy menu jest akurat otwarte.
interface JournalExportMenuProps {
  canExport: boolean
  onExport: () => void
  onExportPdf: () => void
  onExportGpx: () => void
  onExportCsv: () => void
  fileInputRef: RefObject<HTMLInputElement | null>
  onImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void
  onOpenAchievements: () => void
}

export function JournalExportMenu({
  canExport,
  onExport,
  onExportPdf,
  onExportGpx,
  onExportCsv,
  fileInputRef,
  onImportFile,
  onOpenAchievements,
}: JournalExportMenuProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Trofeum osobno od menu eksportu - to coś do zaglądania "dla przyjemności" (patrz
          gamifikacja w AchievementsDrawer.tsx), nie akcja zarządzania danymi, więc nie powinno się
          chować w tym samym menu co eksport/import. */}
      <Button variant="outline" size="icon" aria-label="Osiągnięcia" onClick={onOpenAchievements}>
        <TrophyIcon className="size-4" />
      </Button>
      {/* Trzy osobne przyciski (Eksportuj/Importuj/PDF) skonsolidowane w jedno menu - to akcje
          okazjonalne (backup, udostępnianie), nie codzienne, więc nie muszą zajmować stałego
          miejsca w nagłówku obok tytułu widoku. */}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Eksport i import danych" />}>
          <MoreVerticalIcon className="size-4" />
        </DropdownMenuTrigger>
        {/* Podział eksport/import etykietami + separatorem (poprawka z audytu UI) - 4 pozycje w
            płaskiej liście już dziś mieszają dwa różne kierunki działania (dane wychodzą z apki /
            wchodzą do apki), a przy kolejnym formacie eksportu (np. CSV) byłoby to jeszcze mniej
            czytelne bez podziału. */}
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Eksportuj</DropdownMenuLabel>
            <DropdownMenuItem onClick={onExport}>
              <DownloadIcon />
              JSON
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canExport} onClick={onExportPdf}>
              <FileTextIcon />
              PDF
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canExport} onClick={onExportGpx}>
              <MapIcon />
              Trasa (GPX)
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canExport} onClick={onExportCsv}>
              <TableIcon />
              CSV (Excel/Arkusze)
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Importuj</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <UploadIcon />
              Z pliku JSON
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <input ref={fileInputRef} type="file" accept="application/json" onChange={onImportFile} className="hidden" />
    </div>
  )
}
