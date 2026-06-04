const STATUS_COLORS = {
  vacant:     '#0F5D4E',  // green  — available
  active:     '#0F5D4E',  // green  — healthy lease
  occupied:   '#5C6069',  // muted  — in use
  expired:    '#5C6069',  // muted  — timed out
  terminated: '#B27620',  // amber  — ended early
  pending:    '#1677ff',  // blue   — payment in flight
  completed:  '#0F5D4E',  // green  — payment succeeded
  failed:     '#B27620',  // amber  — payment failed
  open:         '#1677ff',  // blue   — request needs attention
  acknowledged: '#722ED1',  // purple — request seen
  in_progress:  '#FA8C16',  // orange — being worked on
  resolved:     '#0F5D4E',  // green  — request done
  closed:       '#5C6069',  // grey   — archived
};

export function statusColor(status) {
  return STATUS_COLORS[status] ?? '#5C6069';
}
