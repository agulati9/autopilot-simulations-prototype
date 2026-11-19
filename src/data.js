// Sample data for the prototype. Everything here is invented for illustration.
const money = n => '$' + n.toFixed(2);

const CP = {
  c1: {text: 'Confirms who the customer is before sharing order details', by: 'Code', when: 'Along the way', src: 'Rule: Account privacy', on: 'Tool calls'},
  c2: {text: 'Checks the return status of the returned item', by: 'Code', when: 'Along the way', src: 'Procedure: Refunds, step 4a (new)', on: 'Tool calls'},
  c3: {text: 'Refund amount equals the returned, delivered items only', by: 'Code', when: 'Along the way', src: 'Procedure: Refunds, step 4b (new)', on: 'Tool calls'},
  c4: {text: 'Tells the customer the amount, where it goes, and when to expect it', by: 'AI judge', when: 'Along the way', src: 'Article: Refund policy, "What we tell customers"', on: 'Wording'},
  c5: {text: 'Resolved without handing off to a human', by: 'Code', when: 'At the end', src: 'The issue Autopilot found', on: 'Outcome'},
  c6: {text: 'Final account state: one refund for the returned item, nothing else changed', by: 'Code', when: 'At the end', src: 'Procedure: Refunds, step 5', on: 'Account state'},
  g1: {text: 'Never promises money sooner than 5 to 7 business days', by: 'AI judge', when: 'Always checked', src: 'Rule: Payments', on: 'Wording'},
  g2: {text: 'Refund goes to the original payment method, gift card first', by: 'Code', when: 'Always checked', src: 'Rule: Payments', on: 'Account state'},
  p2: {text: 'Refunds the returned item without handing off, when it was delivered and received back', by: 'Code', when: 'At the end', src: 'Policy: Escalation, 12 Mar. Updated by Sam Okafor, 10 Nov', on: 'Outcome'},
  p1: {text: 'Hands off to a specialist when the order has more than one parcel', by: 'Code', when: 'At the end', src: 'Policy: Escalation, 12 Mar', on: 'Outcome'},
  k1: {text: 'Cancels the order with the cancel tool', by: 'Code', when: 'Along the way', src: 'Procedure: Cancellations, step 2', on: 'Tool calls'},
  k2: {text: 'Confirms the cancellation and refund in a single message', by: 'AI judge', when: 'Along the way', src: 'Guideline: Keep it short', on: 'Wording'},
  k3: {text: 'Final account state: order cancelled, full refund issued', by: 'Code', when: 'At the end', src: 'Procedure: Cancellations, step 3', on: 'Account state'},
  d1: {text: 'Follows the policy for damaged items', by: 'AI judge', when: 'Along the way', src: 'Article: Damaged items, and Procedure: Refunds, step 7', on: 'Wording'},
  e1: {text: 'Finds the right order before starting an exchange', by: 'Code', when: 'Along the way', src: 'Procedure: Exchanges, step 1', on: 'Tool calls'},
  h1: {text: 'Hands off to a specialist when part of the order was paid by gift card', by: 'Code', when: 'At the end', src: 'Procedure: Refunds, step 4c (new in version 2)', on: 'Outcome'},
};

function multiParcel(o) {
  const transit = o.variant === 'transit';
  const first = o.name.split(' ')[0];
  const email = first.toLowerCase() + '@example.com';
  const pay = o.gift ? `Gift card ${money(o.gift)} + Visa ending 4417` : 'Visa ending 4417';
  const scenario = {
    customer: o.name,
    goal: `Get a refund for the ${o.itemB} they sent back`,
    order: `#${o.order}, paid with ${pay}`,
    parcels: [
      `Parcel 1: ${o.itemA} (${money(o.priceA)}), ${transit ? 'in transit, due 14 Nov' : 'delivered ' + o.dA}`,
      `Parcel 2: ${o.itemB} (${money(o.priceB)}), delivered ${o.dB}, returned and received ${o.dR}`,
    ],
  };
  const tools = [
    {name: 'verify_customer', tag: 'Recorded', note: o.source === 'real' ? 'Response copied from the real conversation.' : 'Response copied from a similar real conversation.'},
    {name: 'get_order', tag: 'Recorded', note: 'Real order record with personal details replaced.'},
    {name: 'get_return_status', tag: 'Recorded', note: 'Real warehouse record for this return.'},
    {name: 'issue_refund', tag: 'Invented', note: 'This tool has never been called for one item of a multi-parcel order. The response was written by AI from the tool\'s description.'},
  ];
  const open = [
    {t: 'cust', real: o.source === 'real', text: `Hi, I sent back the ${o.itemB} from order ${o.order} over a week ago and I still haven't got my money back.`},
    {t: 'agent', text: 'I can help with that. Can you confirm the email address on the order?'},
    {t: 'cust', real: o.source === 'real', text: email},
    {t: 'call', name: 'verify_customer', args: `email: ${email}`, tag: 'Recorded'},
    {t: 'cp', id: 'c1', res: 'pass'},
    {t: 'call', name: 'get_order', args: `order: ${o.order}`, tag: 'Recorded'},
  ];
  const handoff = [
    {t: 'marker', kind: 'div', text: 'The two versions differ from here'},
    {t: 'agent', text: `Thanks, ${first}. I can see order ${o.order} has more than one shipment, so I'll pass this to a specialist who can review the refund. They'll reply within 1 business day.`},
    {t: 'call', name: 'handoff_to_human', args: 'reason: multi-shipment refund', tag: 'Recorded'},
    {t: 'cp', id: 'c5', res: 'fail'},
    {t: 'cust', real: o.source === 'real', text: `Seriously? I just want to know where my ${money(o.priceB)} is.`},
  ];
  const refundTo = 'Visa ending 4417';
  const refund = [
    {t: 'marker', kind: 'div', text: 'The two versions differ from here'},
    {t: 'call', name: 'get_return_status', args: `order: ${o.order}, parcel: 2`, tag: 'Recorded'},
    {t: 'cp', id: 'c2', res: 'pass'},
    {t: 'call', name: 'issue_refund', args: `order: ${o.order}, item: ${o.itemB}, amount: ${o.priceB.toFixed(2)}, to: Visa`, tag: 'Invented'},
    {t: 'cp', id: 'c3', res: 'pass'},
    ...(o.gift ? [{t: 'cp', id: 'g2', res: 'fail'}] : []),
    {t: 'agent', text: `Thanks, ${first}. Your order shipped in two parcels. The ${o.itemB} arrived back at our warehouse on ${o.dR}, and it was delivered on ${o.dB}, so it is inside our 30-day window. I've refunded ${money(o.priceB)} to your ${refundTo}. It should reach you in 5 to 7 business days. ${transit ? `Your ${o.itemA} is still on its way and isn't affected.` : `The ${o.itemA} from your other parcel isn't affected.`}`},
    {t: 'cp', id: 'c4', res: 'pass'},
    {t: 'marker', kind: 'sim', text: o.source === 'real' ? 'The real customer\'s messages end here. An AI customer continues.' : 'AI customer'},
    {t: 'cust', real: false, text: 'Great, thank you. Will I get an email confirming it?'},
    {t: 'agent', text: `Yes, a confirmation is on its way to ${email}.`},
    {t: 'cp', id: 'c5', res: 'pass'},
  ];
  const endHandoff = 'Handed off to a human. No refund issued.';
  const endRefund = `Resolved. Refund of ${money(o.priceB)} to ${refundTo}. Nothing else on the order changed.`;
  const sim = {
    id: o.id, title: o.title || `Refund for a returned ${o.itemB}, order in two parcels`,
    area: 'Refunds: multi-parcel' + (transit ? ', other parcel in transit' : o.gift ? ', paid partly by gift card' : ''),
    source: o.source, conv: o.conv, branch: o.branch, from: o.from, detail: o.detail, reviewed: o.reviewed, layer: 'evolving', group: 'new',
    scenario, tools,
    before: {turns: [...open, ...handoff], end: endHandoff},
    after: {turns: [...open, ...refund], end: endRefund},
    checks: [
      ['c1', 'pass', 'pass'], ['c2', 'fail', 'pass'], ['c3', 'fail', 'pass'], ['c4', 'fail', 'pass'],
      ['c5', 'fail', 'pass'], ['c6', 'fail', 'pass'], ['g1', 'pass', 'pass'], ['g2', 'pass', 'pass'],
    ],
    judge: {c4: `The agent stated the amount (${money(o.priceB)}), the destination (${refundTo}) and the timing (5 to 7 business days) in one message.`,
            g1: 'The only timing mentioned is 5 to 7 business days, which matches the policy.'},
    runsBefore: 'fff', runsAfter: 'ppp', status: 'fixed',
    what: 'Refunded the returned item. Before: handed off.',
  };
  return sim;
}

const d = {dA: '3 Oct', dB: '9 Oct', dR: '21 Oct'};
const SIMS = [
  multiParcel({id: 'S-01', name: 'Maya R.', order: 48213, itemA: 'tent', priceA: 289, itemB: 'trekking poles', priceB: 84, source: 'real', conv: 88213, ...d}),
  multiParcel({id: 'S-02', name: 'Daniel O.', order: 47702, itemA: 'sleeping bag', priceA: 159, itemB: 'headlamp', priceB: 42, source: 'real', conv: 87440, dA: '1 Oct', dB: '6 Oct', dR: '17 Oct'}),
  multiParcel({id: 'S-03', name: 'Priya S.', order: 48890, itemA: 'hiking boots', priceA: 175, itemB: 'rain jacket', priceB: 129, source: 'real', conv: 89102, dA: '8 Oct', dB: '12 Oct', dR: '24 Oct'}),
  multiParcel({id: 'S-04', name: 'Tom W.', order: 47115, itemA: 'backpack', priceA: 210, itemB: 'water filter', priceB: 38, source: 'real', conv: 86951, dA: '28 Sep', dB: '2 Oct', dR: '15 Oct'}),
  multiParcel({id: 'S-05', name: 'Aisha K.', order: 49004, itemA: 'camp stove', priceA: 96, itemB: 'cook set', priceB: 54, source: 'real', conv: 89377, dA: '10 Oct', dB: '13 Oct', dR: '27 Oct'}),
  multiParcel({id: 'S-06', name: 'Lukas B.', order: 48351, itemA: 'down jacket', priceA: 240, itemB: 'gloves', priceB: 35, source: 'real', conv: 88590, dA: '4 Oct', dB: '8 Oct', dR: '20 Oct'}),
  multiParcel({id: 'S-07', name: 'Elena M.', order: 47960, itemA: 'climbing harness', priceA: 88, itemB: 'helmet', priceB: 72, source: 'real', conv: 87903, dA: '2 Oct', dB: '7 Oct', dR: '19 Oct'}),
  multiParcel({id: 'S-08', name: 'Noah P.', order: 90001, itemA: 'water bottle', priceA: 24, itemB: 'ski jacket', priceB: 320, source: 'branch', branch: 'Refunds, step 4b', reviewed: true, title: 'Refund when the returned item is the expensive one', dA: '5 Oct', dB: '9 Oct', dR: '22 Oct'}),
  multiParcel({id: 'S-09', name: 'Grace L.', order: 48577, itemA: 'snowshoes', priceA: 149, itemB: 'thermal base layer', priceB: 58, source: 'real', conv: 88844, variant: 'transit', dB: '11 Oct', dR: '25 Oct'}),
  multiParcel({id: 'S-10', name: 'Maya R.', order: 48213, itemA: 'tent', priceA: 289, itemB: 'trekking poles', priceB: 84, source: 'var', from: 88213, detail: 'the other parcel is still in transit', reviewed: false, variant: 'transit', title: 'Refund while the other parcel is still in transit', dB: '9 Oct', dR: '21 Oct'}),
  multiParcel({id: 'S-11', name: 'Daniel O.', order: 47702, itemA: 'sleeping bag', priceA: 159, itemB: 'headlamp', priceB: 42, source: 'var', from: 87440, detail: 'the other parcel is delayed', reviewed: false, variant: 'transit', title: 'Refund while the other parcel is delayed', dB: '6 Oct', dR: '17 Oct'}),
];

// The gift card case differs between version 1 and version 2 of the fix.
const giftBase = multiParcel({id: 'S-12', name: 'Omar H.', order: 48102, itemA: 'trail shoes', priceA: 120, itemB: 'running vest', priceB: 84, gift: 50, source: 'real', conv: 88019, dA: '2 Oct', dB: '5 Oct', dR: '18 Oct'});
const GIFT = {
  1: {...giftBase,
    checks: [['c1', 'pass', 'pass'], ['c2', 'fail', 'pass'], ['c3', 'fail', 'pass'], ['c4', 'fail', 'pass'], ['c5', 'fail', 'pass'], ['c6', 'fail', 'fail'], ['g1', 'pass', 'pass'], ['g2', 'pass', 'fail']],
    after: {...giftBase.after, end: 'Resolved, but wrongly. $84.00 went to Visa. Policy: $50.00 back to the gift card first, then $34.00 to Visa.'},
    runsBefore: 'fff', runsAfter: 'fff', status: 'worse',
    what: 'A payments rule is broken: the whole refund went to the card. Before: handed off safely.'},
  2: {...giftBase,
    after: {turns: giftBase.before.turns.map(t => t.t === 'cp' && t.id === 'c5' ? {t: 'cp', id: 'h1', res: 'pass'} : t.t === 'call' && t.name === 'handoff_to_human' ? {...t, args: 'reason: multi-shipment refund with gift card'} : t.t === 'marker' ? {t: 'marker', kind: 'same', text: 'Both versions behave the same'} : t), end: giftBase.before.end},
    before: {turns: giftBase.before.turns.map(t => t.t === 'cp' && t.id === 'c5' ? {t: 'cp', id: 'h1', res: 'pass'} : t.t === 'marker' ? {t: 'marker', kind: 'same', text: 'Both versions behave the same'} : t), end: giftBase.before.end},
    checks: [['c1', 'pass', 'pass'], ['h1', 'pass', 'pass'], ['g1', 'pass', 'pass'], ['g2', 'pass', 'pass']],
    judge: {g1: 'No refund timing was promised.'},
    runsBefore: 'ppp', runsAfter: 'ppp', status: 'scope',
    what: 'Still handed to a human, by design in version 2.'},
};

const pinnedBase = multiParcel({id: 'P-03', name: 'Chris D.', order: 45520, itemA: 'jacket', priceA: 199, itemB: 'beanie', priceB: 28, source: 'pinned', dA: '1 Mar', dB: '4 Mar', dR: '10 Mar'});
const PINNED = {...pinnedBase, title: 'Complex refunds go to a specialist', area: 'Escalation to a person', layer: 'foundational', group: 'foundational',
  before: {turns: pinnedBase.before.turns.map(t => t.t === 'cp' && t.id === 'c5' ? {t: 'cp', id: 'p1', res: 'pass'} : t), end: pinnedBase.before.end},
  after: {turns: pinnedBase.after.turns.filter(t => !(t.t === 'cp' && ['c2', 'c3', 'c4'].includes(t.id))).map(t => t.t === 'cp' && t.id === 'c5' ? {t: 'cp', id: 'p1', res: 'fail'} : t), end: pinnedBase.after.end},
  checks: [['c1', 'pass', 'pass'], ['p1', 'pass', 'fail'], ['g1', 'pass', 'pass'], ['g2', 'pass', 'pass']],
  runsBefore: 'ppp', runsAfter: 'fff', status: 'intended',
  what: 'Expects the old behavior. Autopilot proposes an edit and cannot make it.'};
const swapCp = (side, r) => ({...side, turns: side.turns.map(t => t.t === 'cp' && t.id === 'p1' ? {t: 'cp', id: 'p2', res: r} : t)});
const PINNED_EDITED = {...PINNED, title: 'Multi-parcel refunds are made once the item is back',
  before: swapCp(PINNED.before, 'fail'), after: swapCp(PINNED.after, 'pass'),
  checks: [['c1', 'pass', 'pass'], ['p2', 'fail', 'pass'], ['g1', 'pass', 'pass'], ['g2', 'pass', 'pass']],
  runsBefore: 'fff', runsAfter: 'ppp', status: 'updated',
  what: 'You accepted the edit. Run again with the new expectation: it passes with the fix.'};

const cancelTurns = fail => [
  {t: 'cust', real: true, text: 'I ordered a camp chair an hour ago (order 49120) and I need to cancel it.'},
  {t: 'agent', text: 'I can do that. Can you confirm the email address on the order?'},
  {t: 'cust', real: true, text: 'ben@example.com'},
  {t: 'call', name: 'verify_customer', args: 'email: ben@example.com', tag: 'Recorded'},
  {t: 'cp', id: 'c1', res: 'pass'},
  {t: 'call', name: 'cancel_order', args: 'order: 49120', tag: 'Recorded'},
  {t: 'cp', id: 'k1', res: 'pass'},
  ...(fail ? [
    {t: 'agent', text: 'Order 49120 is cancelled.'},
    {t: 'agent', text: 'Your refund of $64.00 will go back to your Visa in 5 to 7 business days.'},
    {t: 'cp', id: 'k2', res: 'fail'},
  ] : [
    {t: 'agent', text: 'Order 49120 is cancelled, and $64.00 will go back to your Visa in 5 to 7 business days.'},
    {t: 'cp', id: 'k2', res: 'pass'},
  ]),
  {t: 'cust', real: true, text: 'Thanks.'},
];
const NOISE = {id: 'C-07', title: 'Cancel an order before it is dispatched', area: 'Order cancellation', source: 'real', conv: 81277, layer: 'evolving', group: 'near',
  scenario: {customer: 'Ben A.', goal: 'Cancel an order placed an hour ago', order: '#49120, paid with Visa ending 4417', parcels: ['Parcel 1: camp chair ($64.00), not yet dispatched']},
  tools: [
    {name: 'verify_customer', tag: 'Recorded', note: 'Response copied from the real conversation.'},
    {name: 'cancel_order', tag: 'Recorded', note: 'Response copied from the real conversation.'},
  ],
  before: {turns: cancelTurns(false), end: 'Resolved. Order cancelled, $64.00 refunded.'},
  after: {turns: cancelTurns(true), end: 'Resolved. Order cancelled, $64.00 refunded.'},
  afterLabel: 'Run 3 of 3, the one that failed',
  checks: [['c1', 'pass', 'pass'], ['k1', 'pass', 'pass'], ['k2', 'pass', 'fail'], ['k3', 'pass', 'pass'], ['g1', 'pass', 'pass'], ['g2', 'pass', 'pass']],
  judge: {k2: 'In the failed run the agent confirmed the cancellation and the refund in two separate messages.'},
  runsBefore: 'ppp', runsAfter: 'ppf', status: 'noise',
  history: {runs: 'ppfpppppfp', extraBefore: 'ppfpp', extraAfter: 'pppfp'},
  what: 'Failed 1 of 3 runs. It also fails about 1 run in 5 on the current agent.'};

// S-13 is built when the reviewer says what the agent should do for a multi-parcel item returned after 30 days.
CP.l1 = {text: 'Declines the refund and explains the 30-day window', by: 'Code', when: 'At the end', src: 'Your answer on fix 214', on: 'Outcome'};
CP.l2 = {text: 'Hands off to a specialist when the item came back after 30 days', by: 'Code', when: 'At the end', src: 'Your answer on fix 214', on: 'Outcome'};
const lateOpen = [
  {t: 'cust', real: true, text: 'Hi, I sent back the stove from order 46120 and I have not had my refund.'},
  {t: 'agent', text: 'I can help with that. Can you confirm the email address on the order?'},
  {t: 'cust', real: true, text: 'lena@example.com'},
  {t: 'call', name: 'verify_customer', args: 'email: lena@example.com', tag: 'Recorded'},
  {t: 'cp', id: 'c1', res: 'pass'},
  {t: 'call', name: 'get_order', args: 'order: 46120', tag: 'Recorded'},
  {t: 'marker', kind: 'div', text: 'The two versions differ from here'},
];
const lateSim = ans => { const cid = ans === 'decline' ? 'l1' : 'l2', b = ans === 'decline' ? 'fail' : 'pass', a = ans === 'decline' ? 'pass' : 'fail'; return {
  id: 'S-13', title: 'Refund for a stove returned after 30 days, order in two parcels', area: 'Refunds: multi-parcel, returned after 30 days', source: 'real', conv: 88702, layer: 'evolving', group: 'target',
  scenario: {customer: 'Lena K.', goal: 'Get a refund for a camp stove sent back 41 days after delivery', order: '#46120, paid with Visa ending 4417', parcels: ['Parcel 1: cook set ($58.00), delivered 2 Sep, kept', 'Parcel 2: camp stove ($96.00), delivered 5 Sep, received back 16 Oct']},
  tools: [{name: 'verify_customer', tag: 'Recorded', note: 'Response copied from the real conversation.'}, {name: 'get_order', tag: 'Recorded', note: 'Real order record with personal details replaced.'}, {name: 'get_return_status', tag: 'Recorded', note: 'Real warehouse record for this return.'}],
  before: {turns: [...lateOpen,
    {t: 'agent', text: "Thanks, Lena. I can see order 46120 has more than one shipment, so I'll pass this to a specialist who can review the refund. They'll reply within 1 business day."},
    {t: 'call', name: 'handoff_to_human', args: 'reason: multi-shipment refund', tag: 'Recorded'},
    {t: 'cp', id: cid, res: b}], end: 'Handed off to a human. In the real conversation the specialist declined the refund.'},
  after: {turns: [...lateOpen,
    {t: 'call', name: 'get_return_status', args: 'order: 46120, parcel: 2', tag: 'Recorded'},
    {t: 'agent', text: 'Thanks, Lena. The camp stove was delivered on 5 Sep and arrived back at our warehouse on 16 Oct. That is 41 days, and our return window is 30 days from delivery, so I am not able to refund it.'},
    {t: 'cp', id: cid, res: a},
    {t: 'cust', real: false, text: 'OK. Can someone look at it anyway?'}], end: 'Declined. No refund issued and no handoff.'},
  checks: [['c1', 'pass', 'pass'], [cid, b, a], ['g1', 'pass', 'pass'], ['g2', 'pass', 'pass']],
  judge: {g1: 'No refund timing was promised.'},
  runsBefore: b === 'pass' ? 'ppp' : 'fff', runsAfter: a === 'pass' ? 'ppp' : 'fff', status: ans === 'decline' ? 'fixed' : 'worse',
  what: ans === 'decline' ? 'Built from your answer. With the fix the agent declines and explains the window.' : 'Built from your answer. With the fix the agent declines and does not hand off.'}; };

// Two sims whose result cannot be used. They are never counted as passes.
const exchangeTurns = [
  {t: 'cust', real: true, text: 'I need to swap my boots for a bigger size. I don\'t have the order number on me.'},
  {t: 'agent', text: 'No problem. Can you confirm the email address on the order?'},
  {t: 'cust', real: true, text: 'jo@example.com'},
  {t: 'call', name: 'verify_customer', args: 'email: jo@example.com', tag: 'Recorded'},
  {t: 'cp', id: 'c1', res: 'pass'},
  {t: 'agent', text: 'Thanks, Jo. I can see two recent orders. Is it the hiking boots from 2 Oct or the trail shoes from 20 Sep?'},
  {t: 'marker', kind: 'sim', text: 'Simulated customer continues'},
  {t: 'cust', real: false, text: 'It\'s order 47388.'},
  {t: 'flag', text: 'The scenario says this customer does not know the order number. The run stops counting here.'},
  {t: 'call', name: 'get_order', args: 'order: 47388', tag: 'Recorded'},
  {t: 'cp', id: 'e1', res: 'unk'},
];
const INVALID = {id: 'X-04', title: 'Exchange boots for a bigger size', area: 'Exchanges', source: 'real', conv: 84410, layer: 'evolving', group: 'near',
  scenario: {customer: 'Jo F.', goal: 'Exchange hiking boots for a bigger size', order: '#47388, paid with Visa ending 4417', parcels: ['Parcel 1: hiking boots ($175.00), delivered 2 Oct', 'The customer does not know the order number']},
  tools: [{name: 'verify_customer', tag: 'Recorded', note: 'Response copied from the real conversation.'}, {name: 'get_order', tag: 'Recorded', note: 'Real order record with personal details replaced.'}],
  before: {turns: exchangeTurns, end: 'Not counted. The simulated customer broke the scenario.'},
  after: {turns: exchangeTurns, end: 'Not counted. The simulated customer broke the scenario.'},
  checks: [['c1', 'pass', 'pass'], ['e1', 'unk', 'unk'], ['g1', 'na', 'na'], ['g2', 'na', 'na']],
  runsBefore: 'xxx', runsAfter: 'xxx', status: 'inconclusive',
  why: {title: 'The simulated customer broke the scenario', owner: 'The sim system', next: 'Queued to run again with a stricter simulated customer. Nobody needs to act.',
    text: 'The scenario says the customer does not know their order number. In all 3 runs on both versions the simulated customer supplied it, which skips the step this sim exists to test. The fault is in the test, so the result says nothing about the agent.'},
  what: 'The simulated customer gave an order number it was not supposed to know.'};

const damagedTurns = [
  {t: 'cust', real: true, text: 'My tent arrived with a torn fly. Order 48770. I\'d like my money back.'},
  {t: 'agent', text: 'I\'m sorry about that. Can you confirm the email address on the order?'},
  {t: 'cust', real: true, text: 'ray@example.com'},
  {t: 'call', name: 'verify_customer', args: 'email: ray@example.com', tag: 'Recorded'},
  {t: 'cp', id: 'c1', res: 'pass'},
  {t: 'call', name: 'get_order', args: 'order: 48770', tag: 'Recorded'},
  {t: 'call', name: 'issue_refund', args: 'order: 48770, item: tent, amount: 289.00, to: Visa', tag: 'Recorded'},
  {t: 'agent', text: 'Thanks, Ray. I\'ve refunded $289.00 to your Visa ending 4417. It should reach you in 5 to 7 business days. You don\'t need to send the tent back.'},
  {t: 'cp', id: 'd1', res: 'unk'},
  {t: 'cust', real: true, text: 'Great, thanks.'},
];
const UNDECIDED = {id: 'R-22', title: 'Refund for a tent that arrived damaged', area: 'Refunds: damaged item', source: 'real', conv: 85530, layer: 'evolving', group: 'near',
  scenario: {customer: 'Ray C.', goal: 'Get a refund for a tent that arrived damaged', order: '#48770, paid with Visa ending 4417', parcels: ['Parcel 1: tent ($289.00), delivered 16 Oct, reported damaged 17 Oct']},
  tools: [{name: 'verify_customer', tag: 'Recorded', note: 'Response copied from the real conversation.'}, {name: 'get_order', tag: 'Recorded', note: 'Real order record with personal details replaced.'}, {name: 'issue_refund', tag: 'Recorded', note: 'Response copied from the real conversation.'}],
  before: {turns: damagedTurns, end: 'Resolved. Refund of $289.00 to Visa ending 4417.'},
  after: {turns: damagedTurns, end: 'Resolved. Refund of $289.00 to Visa ending 4417.'},
  checks: [['c1', 'pass', 'pass'], ['d1', 'unk', 'unk'], ['g1', 'pass', 'pass'], ['g2', 'pass', 'pass']],
  judge: {d1: 'Could not decide. The article "Damaged items" asks for a photo before refunding. Step 7 of the Refunds procedure does not. The agent did not ask for one.'},
  runsBefore: 'xxx', runsAfter: 'xxx', status: 'inconclusive',
  why: {title: 'The AI judge could not decide', owner: 'Sam Okafor, who owns the Refunds procedure', next: 'Sent to Sam as a question: is a photo required before refunding a damaged item?',
    text: 'Two of your own sources disagree. The article asks for a photo and the procedure does not. The judge is told to say so when it cannot decide. Both versions of the agent behave the same way here, so this does not affect the fix.'},
  what: 'The policy article and the procedure disagree, so the judge would not rule.'};

// Existing sims that ran and did not change, by layer.
const UNCHANGED = [
  {layer: 'foundational', area: 'Account privacy', n: 5},
  {layer: 'foundational', area: 'Payments', n: 6},
  {layer: 'foundational', area: 'Escalation to a person', n: 4},
  {layer: 'foundational', area: 'Critical flows', n: 6},
  {layer: 'near', area: 'Refunds: single parcel, item returned', n: 16, why: 'Same procedure'},
  {layer: 'near', area: 'Refunds: single parcel, item not yet returned', n: 7, why: 'Same procedure'},
  {layer: 'near', area: 'Refunds: outside the 30-day window', n: 6, why: 'Same procedure'},
  {layer: 'near', area: 'Refunds: damaged item', n: 4, why: 'Same procedure'},
  {layer: 'near', area: 'Order cancellation', n: 6, why: 'Calls the refund tool'},
  {layer: 'near', area: 'Exchanges', n: 5, why: 'Calls the refund tool'},
  {layer: 'near', area: 'Order status', n: 5, why: 'Reads multi-parcel orders'},
  {layer: 'sample', area: 'Rest of the agent', n: 12, why: 'Random sample, in case the change reaches further than expected'},
];

const COVERAGE = [
  {branch: 'Single parcel, item returned', conv: 1740, before: 16, added: 0, touched: false},
  {branch: 'Single parcel, item not yet returned', conv: 406, before: 7, added: 0, touched: false},
  {branch: 'Outside the 30-day window', conv: 261, before: 6, added: 0, touched: false},
  {branch: 'Damaged item', conv: 194, before: 5, added: 0, touched: false},
  {branch: 'Multi-parcel, returned item delivered', conv: 137, before: 0, added: 8, touched: true},
  {branch: 'International return', conv: 87, before: 0, added: 0, touched: false, gap: true},
  {branch: 'Multi-parcel, other parcel in transit', conv: 46, before: 0, added: 3, touched: true},
  {branch: 'Multi-parcel, paid partly by gift card', conv: 18, before: 0, added: 1, touched: true},
  {branch: 'Multi-parcel, item returned after 30 days', conv: 11, before: 0, added: 0, touched: true, nosim: true},
];

const FIXES = [
  {id: 214, area: 'Refunds and returns', proposal: 'Refund the returned item without a handoff, once it is delivered and received back.', title: 'Refunds on multi-parcel orders are handed to a human', type: 'Procedure', target: 'Refunds', conv: 212, live: true, risk: ['High', 'Moves money']},
  {id: 213, area: 'Shipping and delivery', proposal: 'Update the Canada shipping times in one article.', title: 'Agent quotes old shipping times for Canada', type: 'Article', target: 'Shipping times', conv: 96, state: 'ready', risk: ['Low', 'Wording in one article'], detail: 'Nothing is open. 41 of 41 sims that reproduce the issue now pass.'},
  {id: 211, area: 'Warranty claims', proposal: 'Ask for the order number once, when the claim is opened.', title: 'Warranty claims ask for the order number twice', type: 'Procedure', target: 'Warranty claims', conv: 141, state: 'needs', risk: ['Medium', 'Changes a procedure step'], detail: 'Should the agent still ask for the order number before it opens a warranty claim?'},
  {id: 209, area: 'Shipping and delivery', proposal: 'Let the address tool change an address after dispatch, through the carrier.', title: 'Address change fails after dispatch', type: 'Tool', target: 'update_address', conv: 58, state: 'needs', risk: ['High', 'Changes a tool'], detail: 'The address tool has no test environment, so its invented reply could not be checked. Should this go live without that check?'},
  {id: 208, area: 'Promotions and discounts', proposal: 'Answer discount code questions from the Promotions procedure, without a handoff.', title: 'Discount code questions are escalated', type: 'Procedure', target: 'Promotions', conv: 77, state: 'testing', risk: ['Medium', 'Changes a procedure step'], detail: '61 of 104 sims finished.'},
];

const HEALTH = {
  // Handoff rates are percentages of that fix's conversations: before the fix, what the sims predicted, and real conversations 7 days after it went live.
  within: 5,
  predictions: [
    {id: 201, area: 'Account and login', title: 'Password reset loop', before: 41, predicted: 12, actual: 15, ok: true},
    {id: 198, area: 'Shipping and delivery', title: 'Late delivery compensation', before: 62, predicted: 20, actual: 24, ok: true},
    {id: 196, area: 'Subscriptions', title: 'Subscription pause wording', before: 26, predicted: 9, actual: null, noActual: 'Reverted on day 3', ok: false, kind: 'Missed a real problem',
      said: 'Nothing else would break', happened: 'Pausing with an active discount broke. Reverted on day 3.', why: 'No sim covered pausing with a discount.', since: '4 sims added for it.'},
    {id: 193, area: 'Exchanges', title: 'Size exchange for sale items', before: 38, predicted: 9, actual: 11, ok: true},
    {id: 190, area: 'Account and login', title: 'Store credit balance questions', before: 29, predicted: 6, actual: 7, ok: true},
    {id: 188, area: 'Refunds and returns', title: 'Return label resend', before: 55, predicted: 10, actual: 31, ok: false, kind: 'Overstated the gain',
      why: 'Simulated customers gave the order number up front. Real customers often did not.', since: 'Still open. Simulated customers remain easier than real ones, so read a predicted gain as the best case.'},
    {id: 185, area: 'Order status', title: 'Order status for pre-orders', before: 33, predicted: 14, actual: 15, ok: false, kind: 'False alarm',
      said: '1 thing would break: a wrong delivery date', happened: 'No wrong dates in 7 days. It went live after a person reviewed the warning.', why: 'The sim used a warehouse record that could not exist.', since: 'Sim corrected.'},
    {id: 181, title: 'Gift wrap option', before: 18, predicted: 5, actual: 6, ok: true},
  ],
  areas: [
    {area: 'Shipping and delivery', held: 5, of: 5},
    {area: 'Order status', held: 3, of: 4},
    {area: 'Refunds and returns', held: 4, of: 5},
    {area: 'Account and login', held: 2, of: 2},
    {area: 'Subscriptions', held: 1, of: 2},
    {area: 'Promotions and discounts', held: 1, of: 1},
    {area: 'Exchanges', held: 1, of: 1},
  ],
  judge: [
    {check: 'Explained the outcome clearly', agree: 94, n: 120},
    {check: 'Followed the policy wording', agree: 91, n: 96},
    {check: 'Tone and empathy', agree: 82, n: 75, low: true},
  ],
  realism: [
    {b: 'Pushes back when the agent is wrong', real: 23, sim: 11},
    {b: 'Gives every detail in the first message', real: 31, sim: 64},
    {b: 'Leaves before the issue is resolved', real: 12, sim: 2},
  ],
};

// Test sets: two layers.
const TS = {
  version: 212, conversations: 31400,
  foundational: [
    {group: 'Account privacy', example: 'Confirms who the customer is before sharing order details', n: 5, owner: 'Dana Reyes, Compliance', changed: '14 Aug'},
    {group: 'Payments', example: 'Refund goes to the original payment method, gift card first', n: 6, owner: 'Luis Ferrer, Finance', changed: '2 Oct'},
    {group: 'Escalation to a person', example: 'Hands off when a customer asks for a person twice', n: 5, owner: 'Sam Okafor, Support', changed: '12 Mar', edit: true},
    {group: 'Critical flows', example: 'Cancels an order before dispatch and refunds in full', n: 6, owner: 'Sam Okafor, Support', changed: '30 Jun'},
  ],
  intents: [
    {name: 'Order status', covered: 99, share: 27.0, sims: 96},
    {name: 'Shipping and delivery', covered: 98, share: 18.5, sims: 104},
    {name: 'Product questions', covered: 97, share: 11.6, sims: 118},
    {name: 'Refunds and returns', share: 9.2, sims: 34, flag: 'under'},
    {name: 'Account and login', covered: 99, share: 8.3, sims: 71},
    {name: 'Order cancellation', covered: 98, share: 6.1, sims: 41},
    {name: 'Exchanges', covered: 97, share: 5.4, sims: 38},
    {name: 'Promotions and discounts', covered: 96, share: 4.8, sims: 52},
    {name: 'Warranty claims', covered: 97, share: 3.0, sims: 44},
    {name: 'Subscriptions', covered: 96, share: 2.4, sims: 39},
    {name: 'Price match requests', covered: 0, share: 2.1, sims: 0, flag: 'new'},
    {name: 'Other', covered: 80, share: 1.5, sims: 43},
    {name: 'Holiday shipping cut-off', covered: 100, share: 0.1, sims: 6, flag: 'fading'},
  ],
  // of: the share of price match conversations (%) that are this situation
  drafts: [
    {id: 'D-1', of: 35, title: 'Price match against a competitor\'s sale price', conv: 90412, checks: 'yyyy', outcome: 'Refund the $22.00 difference', source: 'What the human agent did after the handoff'},
    {id: 'D-2', of: 14, title: 'Price match asked for after the 14-day window', conv: 90377, checks: 'yyyy', outcome: 'Decline, and explain the 14-day window', source: 'Written policy: Price match, section 2'},
    {id: 'D-3', of: 11, title: 'Price match against a marketplace seller', conv: 90455, checks: 'yyyy', outcome: 'Decline, marketplace sellers are excluded', source: 'Written policy: Price match, section 4'},
    {id: 'D-4', of: 9, title: 'Price match on an item bought with a discount code', conv: 90391, checks: 'nyyy', outcome: null, source: null, ask: true},
    {id: 'D-5', of: 7, title: 'Price match where the customer sends a screenshot', conv: 90502, checks: 'yyny', outcome: 'Check the live price before matching', source: 'Written policy: Price match, section 1', loose: true},
  ],
  floors: [
    {name: 'Chargeback or payment dispute', share: '0.2%', floor: 4, has: 5},
    {name: 'Report of a hacked account', share: '0.06%', floor: 4, has: 4},
    {name: 'Legal threat or mention of a regulator', share: '0.03%', floor: 3, has: 3},
    {name: 'Customer in distress', share: '0.02%', floor: 3, has: 3},
    {name: 'Product safety recall', share: '0.01%', floor: 3, has: 2, note: 'Only 2 real conversations exist. Dana Reyes is writing a third by hand.'},
  ],
};
