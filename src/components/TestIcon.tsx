import { TEST_DEFINITIONS, type TestType } from '../lib/types';

export function TestIcon({ type, size = 24 }: { type: TestType; size?: number }) {
  const def = TEST_DEFINITIONS[type];
  if (def.iconType === 'emoji') {
    return <span style={{ fontSize: size }} className="leading-none shrink-0">{def.icon}</span>;
  }
  return <img src={def.icon} alt={def.name} style={{ width: size, height: size }} className="object-contain shrink-0" />;
}
