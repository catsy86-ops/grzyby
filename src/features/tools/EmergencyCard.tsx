import { useEffect, useState } from 'react'
import { HeartPulseIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { getCurrentPosition } from '../../utils/geolocation'
import { buildLocationSmsUrl } from '../../utils/locationSms'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { ToolDialog } from './ToolDialog'

// Karta awaryjna - podstawowe dane medyczne + kontakt, dostępne offline (localStorage przez
// appStore, jak reszta ustawień tej apki), na wypadek urazu/zagubienia w lesie, gdy ktoś inny
// (ratownik, przypadkowy przechodzień) musi szybko sprawdzić te informacje albo skontaktować się
// w Twoim imieniu. Pozycja GPS pobierana jednorazowo (nie ciągłe śledzenie jak na mapie) dopiero
// po otwarciu karty - to nie jest widok używany non-stop w trakcie wyprawy.
export function EmergencyCard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const emergencyInfo = useAppStore((s) => s.emergencyInfo)
  const setEmergencyInfo = useAppStore((s) => s.setEmergencyInfo)
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [positionError, setPositionError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPositionError(null)
    getCurrentPosition()
      .then((coords) => setPosition([coords.latitude, coords.longitude]))
      .catch((err) => setPositionError(err instanceof Error ? err.message : 'Nie udało się ustalić lokalizacji'))
  }, [open])

  return (
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<HeartPulseIcon className="size-5 text-destructive" />}
      title="Karta awaryjna"
    >
      <p className="text-sm leading-relaxed text-foreground/85">
        Dane zapisane wyłącznie na tym urządzeniu - widoczne tu dla Ciebie (np. do pokazania
        ratownikowi) i wysyłane dalej tylko wtedy, gdy sam(a) użyjesz przycisku SMS/telefon
        poniżej.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <label className="block text-sm">
          Grupa krwi
          <Input
            value={emergencyInfo.bloodType}
            onChange={(e) => setEmergencyInfo({ ...emergencyInfo, bloodType: e.target.value })}
            placeholder="np. A Rh+"
            className="mt-1"
          />
        </label>
        <label className="block text-sm">
          Alergie / stałe leki
          <Input
            value={emergencyInfo.allergies}
            onChange={(e) => setEmergencyInfo({ ...emergencyInfo, allergies: e.target.value })}
            placeholder="np. penicylina, astma"
            className="mt-1"
          />
        </label>
        <label className="block text-sm">
          Kontakt awaryjny - imię
          <Input
            value={emergencyInfo.contactName}
            onChange={(e) => setEmergencyInfo({ ...emergencyInfo, contactName: e.target.value })}
            placeholder="np. żona, syn"
            className="mt-1"
          />
        </label>
        <label className="block text-sm">
          Kontakt awaryjny - telefon
          <Input
            type="tel"
            value={emergencyInfo.contactPhone}
            onChange={(e) => setEmergencyInfo({ ...emergencyInfo, contactPhone: e.target.value })}
            placeholder="np. +48 600 000 000"
            className="mt-1"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPinIcon className="size-3.5 shrink-0" />
        {position
          ? `Bieżąca pozycja: ${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
          : (positionError ?? 'Ustalanie pozycji...')}
      </div>

      {positionError && (
        <Alert variant="warning" className="mt-2">
          <AlertDescription className="text-current">
            Nie udało się ustalić pozycji - SMS zostanie wysłany bez współrzędnych.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="flex-1"
          disabled={!emergencyInfo.contactPhone.trim()}
          onClick={() => {
            window.location.href = buildLocationSmsUrl(
              position?.[0] ?? null,
              position?.[1] ?? null,
              emergencyInfo.contactPhone,
            )
          }}
        >
          <MessageCircleIcon />
          {position ? 'SMS z lokalizacją do kontaktu' : 'SMS bez lokalizacji do kontaktu'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={!emergencyInfo.contactPhone.trim()}
          onClick={() => {
            window.location.href = `tel:${emergencyInfo.contactPhone.trim()}`
          }}
        >
          <PhoneIcon />
          Zadzwoń do kontaktu
        </Button>
      </div>
    </ToolDialog>
  )
}
