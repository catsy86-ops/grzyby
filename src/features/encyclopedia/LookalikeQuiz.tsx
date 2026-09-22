import { useMemo, useState } from 'react'
import { CheckIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import type { Species } from '../../db/schema'
import { ALL_SPECIES } from '../../data/species'
import { EdibilityBadge } from '../../components/EdibilityBadge'
import { buildQuizPairs, pickRandomPair, type QuizPair } from '../../utils/lookalikeQuiz'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'

const PAIRS = buildQuizPairs(ALL_SPECIES)

interface LookalikeQuizProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Round {
  pair: QuizPair
  // Kolejność wyświetlenia (target/decoy) losowana raz na rundę, żeby poprawna odpowiedź nie
  // zawsze była po tej samej stronie.
  order: [Species, Species]
}

function newRound(): Round | null {
  const pair = pickRandomPair(PAIRS)
  if (!pair) return null
  const order: [Species, Species] =
    Math.random() < 0.5 ? [pair.target, pair.decoy] : [pair.decoy, pair.target]
  return { pair, order }
}

// Fiszki do nauki rozróżniania niebezpiecznych sobowtórów (nowe.md + backlog QoL) - reużywa w
// całości już wypełnione `species.lookalikes`, bez żadnej nowej treści redakcyjnej. Wynik sesji
// jest celowo tylko w pamięci komponentu (nie appStore/achievements) - to szybkie ćwiczenie, nie
// kolejny trwały licznik do utrzymania.
export function LookalikeQuiz({ open, onOpenChange }: LookalikeQuizProps) {
  const [round, setRound] = useState<Round | null>(() => newRound())
  const [answered, setAnswered] = useState<Species | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  const isReady = useMemo(() => PAIRS.length > 0, [])

  function handleAnswer(choice: Species) {
    if (!round || answered) return
    setAnswered(choice)
    setScore((s) => ({ correct: s.correct + (choice.id === round.pair.target.id ? 1 : 0), total: s.total + 1 }))
  }

  function handleNext() {
    setRound(newRound())
    setAnswered(null)
  }

  function handleRestart() {
    setScore({ correct: 0, total: 0 })
    handleNext()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader>
          <DrawerTitle>Quiz sobowtórów</DrawerTitle>
          <DrawerDescription>
            Który z tych dwóch gatunków to podana nazwa? Ćwiczy rozróżnianie gatunków mylonych ze sobą.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-3 px-4 pb-4">
          {!isReady || !round ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Za mało gatunków ze zdjęciami i sobowtórami, żeby ułożyć quiz.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  Który z nich to <span className="font-semibold">{round.pair.target.nameCommon}</span>?
                </p>
                <Badge variant="outline">
                  {score.correct}/{score.total}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {round.order.map((candidate, position) => {
                  const isCorrect = candidate.id === round.pair.target.id
                  const isChosen = answered?.id === candidate.id
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      disabled={answered != null}
                      onClick={() => handleAnswer(candidate)}
                      // Pozycyjna etykieta ("Kandydat A/B"), nie nazwa gatunku - zdradziłaby
                      // odpowiedź czytnikowi ekranu przed wyborem (obrazek ma celowo puste `alt`).
                      aria-label={answered ? candidate.nameCommon : `Kandydat ${position === 0 ? 'A' : 'B'}`}
                      className={`flex flex-col overflow-hidden rounded-lg border text-left transition-colors ${
                        answered
                          ? isCorrect
                            ? 'border-primary ring-2 ring-primary/40'
                            : isChosen
                              ? 'border-destructive'
                              : 'border-border opacity-60'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="aspect-square w-full bg-muted">
                        <img
                          src={candidate.imageUrls[0]}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      </div>
                      {answered && (
                        <div className="flex items-center gap-1 p-2 text-xs">
                          {isCorrect ? (
                            <CheckIcon className="size-3.5 shrink-0 text-primary" />
                          ) : isChosen ? (
                            <XIcon className="size-3.5 shrink-0 text-destructive" />
                          ) : null}
                          <span className="truncate">{candidate.nameCommon}</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {answered && (
                <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{round.pair.target.nameCommon}</span>
                    <EdibilityBadge edibility={round.pair.target.edibility} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{round.pair.decoy.nameCommon}</span>
                    <EdibilityBadge edibility={round.pair.decoy.edibility} />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {answered && (
                  <Button className="flex-1" onClick={handleNext}>
                    Następne pytanie
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleRestart}>
                  <RotateCcwIcon className="size-3.5" />
                  Reset wyniku
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
