export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const TOKEN = process.env.RD_TOKEN;
  const PIPELINE_ID = process.env.RD_PIPELINE_ID;
  const BASE = 'https://crm.rdstation.com/api/v1';

  try {
    const openRes = await fetch(`${BASE}/deals?token=${TOKEN}&deal_pipeline_id=${PIPELINE_ID}&limit=200`);
    const openData = await openRes.json();

    const wonRes = await fetch(`${BASE}/deals?token=${TOKEN}&deal_pipeline_id=${PIPELINE_ID}&limit=200&win=true`);
    const wonData = await wonRes.json();

    const lostRes = await fetch(`${BASE}/deals?token=${TOKEN}&deal_pipeline_id=${PIPELINE_ID}&limit=200&win=false`);
    const lostData = await lostRes.json();

    const tasksRes = await fetch(`${BASE}/tasks?token=${TOKEN}&limit=200`);
    const tasksData = await tasksRes.json();

    const mapDeal = d => ({
      id: d._id,
      name: d.name,
      stage: d.deal_stage?.name || 'Sem etapa',
      stage_id: d.deal_stage?._id,
      last_activity_at: d.last_activity_at,
      created_at: d.created_at,
      closed_at: d.closed_at,
      user: d.user?.name || '—',
      win: d.win,
      amount_total: d.amount_total || 0,
      products: (d.deal_products || []).map(p => ({ name: p.name, total: p.total })),
      interactions: d.interactions || 0,
      loss_reason: d.deal_lost_reason?.name || null,
    });

    const tasks = (tasksData.tasks || []).map(t => ({
      id: t._id,
      subject: t.subject,
      type: t.type,
      done: t.done,
      done_date: t.done_date,
      created_at: t.created_at,
      deal_id: t.deal_id,
      status: t.status,
    }));

    res.status(200).json({
      open: (openData.deals || []).map(mapDeal),
      open_total: openData.total,
      won: (wonData.deals || []).map(mapDeal),
      won_total: wonData.total,
      lost: (lostData.deals || []).map(mapDeal),
      lost_total: lostData.total,
      tasks,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
