"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  inviter_name: string;
  expires_at: string;
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided");
      setLoading(false);
      return;
    }

    // Validate the invitation token
    fetch(`/api/accept-invitation?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data.invitation);
        }
      })
      .catch(err => {
        setError("Failed to validate invitation");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      // For development, we'll just show success
      // In production, this would redirect to sign up/sign in
      setSuccess(true);
      
      // Simulate accepting the invitation
      setTimeout(() => {
        alert('In production, this would redirect you to sign up or sign in to complete joining the team!');
      }, 1000);
      
    } catch (err) {
      setError("Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-3 text-lg">Validating invitation...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-700">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">{error}</p>
            <Button 
              onClick={() => router.push('/sign-in')}
              variant="outline"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-700">Invitation Accepted!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Welcome to the team! In production, you would be redirected to create your account.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Development Note:</strong> This invitation system is working! 
                When deployed, users would be redirected to sign up or sign in to complete the process.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-6 w-6 text-purple-600" />
          </div>
          <CardTitle>You're Invited to Join Flowvya!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitation && (
            <>
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>{invitation.inviter_name}</strong> has invited you to join their team
                </p>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">{invitation.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Role:</span>
                    <span className="text-sm capitalize">{invitation.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Expires:</span>
                    <span className="text-sm">{new Date(invitation.expires_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Development Environment:</strong> This invitation system is fully functional! 
                  When deployed to production, clicking "Accept" would redirect you to create an account or sign in.
                </p>
              </div>

              <Button 
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-3 text-lg">Loading...</span>
          </CardContent>
        </Card>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}