import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Flex } from 'antd';
import { useAuth } from '../context/AuthContext.jsx';

const { Title, Text } = Typography;

const FAQ_RESPONSES = [
  {
    keywords: ['pay', 'rent', 'payment', 'mpesa', 'stk', 'how much'],
    response: "Your landlord initiates rent payments via M-Pesa STK Push. When they do, you'll receive a prompt on your phone to confirm. You can view your payment history any time on the Payments page in the sidebar.",
  },
  {
    keywords: ['lease', 'agreement', 'contract', 'terms', 'end date'],
    response: "Your lease details are on the My Lease page in the sidebar. You'll find your monthly rent, start date, end date (if any), unit details, and your landlord's contact info there.",
  },
  {
    keywords: ['repair', 'maintenance', 'broken', 'leak', 'fix', 'issue', 'problem', 'complaint'],
    response: "Need a repair or have a complaint? Click 'Requests' in the sidebar to file a new request. Your landlord will review it and update you on progress. You can track all your past requests there too.",
  },
  {
    keywords: ['move', 'change unit', 'apply', 'different unit', 'new place', 'transfer'],
    response: "Interested in another unit? Check 'Available Units' in the sidebar to see vacant units from your landlord. Click 'Apply to Move Here' on any unit you like. Your landlord will review your application and let you know.",
  },
  {
    keywords: ['landlord', 'contact', 'phone', 'email', 'reach'],
    response: "Your landlord's contact info is on the My Lease page. You can also reach them through requests for anything urgent.",
  },
  {
    keywords: ['password', 'login', 'sign in', 'forgot'],
    response: "Right now, password resets aren't supported in the portal. Please contact your landlord directly if you need to change your password — they can update it for you.",
  },
  {
    keywords: ['receipt', 'paid', 'history', 'transaction'],
    response: "All your M-Pesa receipts are on the Payments page. Each completed payment shows the M-Pesa receipt number and when it was paid.",
  },
  {
    keywords: ['withdraw', 'cancel application'],
    response: "You can withdraw a pending application from the My Applications page. Just click 'Withdraw' on the pending row. Once your landlord has approved or rejected it, withdrawal isn't possible.",
  },
];

const FALLBACK = "I'm not sure how to help with that yet — I'm still learning. For anything not covered here, please file a request via the Requests page, or contact your landlord directly. Their info is on the My Lease page.";

function findResponse(userMessage) {
  const lower = userMessage.toLowerCase();
  for (const faq of FAQ_RESPONSES) {
    if (faq.keywords.some(kw => lower.includes(kw))) {
      return faq.response;
    }
  }
  return FALLBACK;
}

const CHIPS = [
  'How do I pay rent?',
  'I need a repair',
  'Can I switch units?',
  'Contact my landlord',
];

const INIT_MESSAGE = {
  role: 'bot',
  content: "Hi! I'm the RentSync assistant. Ask me a question about your rent, lease, requests, or moving units — or anything else about using this portal.",
  timestamp: Date.now(),
};

function BotAvatar() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: '#0F5D4E', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 600, flexShrink: 0,
    }}>
      R
    </div>
  );
}

function UserAvatar({ initial }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: '#C9E6DC', color: '#0F5D4E',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 600, flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

function MessageBubble({ msg, userInitial }) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 16,
    }}>
      {isUser ? <UserAvatar initial={userInitial} /> : <BotAvatar />}
      <div style={{ maxWidth: '72%' }}>
        <div style={{
          background:    isUser ? '#E8F4EF' : '#fff',
          border:        isUser ? 'none' : '1px solid #EFF0F2',
          borderRadius:  isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
          padding:       '10px 14px',
          fontSize:      14,
          lineHeight:    1.6,
          color:         '#14161A',
        }}>
          {msg.content}
        </div>
        <Text type="secondary" style={{
          fontSize: 11, display: 'block', marginTop: 3,
          textAlign: isUser ? 'right' : 'left',
        }}>
          {time}
        </Text>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
      <BotAvatar />
      <div style={{
        background: '#fff', border: '1px solid #EFF0F2',
        borderRadius: '4px 12px 12px 12px',
        padding: '10px 16px',
        color: '#5C6069', fontSize: 18, letterSpacing: 3,
      }}>
        •••
      </div>
    </div>
  );
}

export default function TenantHelp() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([INIT_MESSAGE]);
  const [input,    setInput]    = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const userInitial = (user?.full_name || user?.email || 'U')[0].toUpperCase();

  function submit(text) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: Date.now() }]);
    setInput('');
    setThinking(true);

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', content: findResponse(trimmed), timestamp: Date.now() }]);
      setThinking(false);
    }, 200);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Help</Title>
        <Text type="secondary">Get answers to common questions</Text>
      </div>

      <Card
        style={{ borderRadius: 8 }}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 196px)' } }}
      >
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} userInitial={userInitial} />
          ))}
          {thinking && <ThinkingBubble />}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid #EFF0F2' }}>
          <Flex gap={8} wrap="wrap" style={{ marginBottom: 10 }}>
            {CHIPS.map(chip => (
              <Button
                key={chip}
                size="small"
                disabled={thinking}
                onClick={() => submit(chip)}
                style={{ borderRadius: 16, fontSize: 12 }}
              >
                {chip}
              </Button>
            ))}
          </Flex>
          <Flex gap={8}>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              disabled={thinking}
            />
            <Button
              type="primary"
              disabled={!input.trim() || thinking}
              onClick={() => submit(input)}
            >
              Send
            </Button>
          </Flex>
        </div>
      </Card>
    </>
  );
}
