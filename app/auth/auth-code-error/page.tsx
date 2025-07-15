import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function AuthCodeError() {
  return (
    <div className="flex flex-col justify-center items-center w-full h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-red-600">
            Authentication Error
          </CardTitle>
          <CardDescription>
            Sorry, we couldn't sign you in. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            There was an issue with the authentication process. This could be due to:
          </p>
          <ul className="text-xs text-muted-foreground text-left space-y-1">
            <li>• The authentication link expired</li>
            <li>• An invalid authentication code</li>
            <li>• A temporary server issue</li>
          </ul>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/sign-in">
                Try signing in again
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                Go to homepage
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}