import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangleIcon } from 'lucide-react'
import { Button } from './ui/button'
import { Alert, AlertTitle, AlertDescription } from './ui/alert'

interface Props {
  children: ReactNode
  resetKey?: unknown
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack)
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <Alert variant="destructive-soft" className="max-w-sm">
            <AlertTriangleIcon />
            <AlertTitle>Coś poszło nie tak</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <span>
                Ten widok napotkał błąd i nie może się wyświetlić. Twoje zapisane dane są bezpieczne -
                spróbuj wrócić do innej zakładki lub odświeżyć aplikację.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => this.setState({ error: null })}
              >
                Spróbuj ponownie
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )
    }
    return this.props.children
  }
}
