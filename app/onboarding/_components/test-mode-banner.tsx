"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TestTube, 
  CreditCard, 
  Zap, 
  Copy, 
  Check,
  Info
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TestModeBannerProps {
  isTestMode?: boolean;
  className?: string;
}

export function TestModeBanner({ isTestMode = true, className }: TestModeBannerProps) {
  if (!isTestMode) return null;
  
  return (
    <Alert className="border-orange-200 bg-orange-50 mb-6">
      <TestTube className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <strong>Test Mode:</strong> You're in development mode. Use test data and test payment methods.
        No real charges will be made.
      </AlertDescription>
    </Alert>
  );
}

interface TestCreditCardHelperProps {
  onUseTestCard: (cardData: TestCardData) => void;
}

export interface TestCardData {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
  type: string;
}

const TEST_CARDS: TestCardData[] = [
  {
    number: "4242424242424242",
    expiry: "12/34",
    cvc: "123",
    name: "Test User",
    type: "Visa (Success)"
  },
  {
    number: "4000000000000002",
    expiry: "12/34", 
    cvc: "123",
    name: "Test User",
    type: "Visa (Declined)"
  },
  {
    number: "4000000000009995",
    expiry: "12/34",
    cvc: "123", 
    name: "Test User",
    type: "Visa (Insufficient Funds)"
  }
];

export function TestCreditCardHelper({ onUseTestCard }: TestCreditCardHelperProps) {
  const [copiedCard, setCopiedCard] = useState<string | null>(null);
  
  const copyToClipboard = (text: string, cardType: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCard(cardType);
    toast.success(`${cardType} details copied to clipboard`);
    setTimeout(() => setCopiedCard(null), 2000);
  };
  
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <CreditCard className="w-5 h-5" />
          Test Payment Methods
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-blue-700 mb-3">
          <Info className="w-4 h-4" />
          Use these test credit cards for development and testing
        </div>
        
        {TEST_CARDS.map((card, index) => (
          <div key={index} className="p-3 bg-white rounded-lg border border-blue-200">
            <div className="flex justify-between items-start mb-2">
              <Badge variant="outline" className="text-xs">
                {card.type}
              </Badge>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={() => copyToClipboard(
                    `Card: ${card.number}\nExpiry: ${card.expiry}\nCVC: ${card.cvc}\nName: ${card.name}`,
                    card.type
                  )}
                >
                  {copiedCard === card.type ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => onUseTestCard(card)}
                >
                  Use
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <span className="font-mono">{card.number}</span>
              </div>
              <div>
                <span className="font-mono">{card.expiry} • {card.cvc}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface QuickFillTestDataProps {
  onFillTestData: (data: any) => void;
}

export function QuickFillTestData({ onFillTestData }: QuickFillTestDataProps) {
  const testBusinessData = {
    companyName: "Acme Corp",
    businessType: "llc",
    industry: "technology",
    teamSize: "10-50",
    country: "US",
    address: "123 Test Street",
    city: "San Francisco", 
    state: "CA",
    zipCode: "94102",
    phone: "+1 (555) 123-4567",
    website: "https://acme.com",
    taxId: "12-3456789"
  };
  
  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Zap className="w-5 h-5" />
          Quick Fill Test Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-green-700 mb-3">
          Quickly populate forms with realistic test data for development
        </p>
        <Button
          onClick={() => onFillTestData(testBusinessData)}
          className="w-full bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <Zap className="w-4 h-4 mr-2" />
          Fill Business Information
        </Button>
      </CardContent>
    </Card>
  );
}

export function WebhookTestingInterface() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const testWebhook = async (eventType: string) => {
    try {
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, webhookUrl })
      });
      
      if (response.ok) {
        setTestResults(prev => [...prev, `✅ ${eventType}: Success`]);
      } else {
        setTestResults(prev => [...prev, `❌ ${eventType}: Failed`]);
      }
    } catch (error) {
      setTestResults(prev => [...prev, `❌ ${eventType}: Error - ${error}`]);
    }
  };
  
  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-purple-800">
          <TestTube className="w-5 h-5" />
          Webhook Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-sm font-medium text-purple-700">Test Webhook URL:</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-app.com/webhooks/test"
            className="w-full mt-1 px-3 py-2 text-sm border border-purple-200 rounded-md"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {['subscription.created', 'payment.succeeded', 'payment.failed'].map(eventType => (
            <Button
              key={eventType}
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => testWebhook(eventType)}
              disabled={!webhookUrl}
            >
              Test {eventType}
            </Button>
          ))}
        </div>
        
        {testResults.length > 0 && (
          <div className="mt-3 p-3 bg-white rounded border border-purple-200">
            <h4 className="text-sm font-medium text-purple-800 mb-2">Test Results:</h4>
            <div className="space-y-1 text-xs font-mono">
              {testResults.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-xs"
              onClick={() => setTestResults([])}
            >
              Clear Results
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}