import { Directory } from '@/types/auth';

export const DEFAULT_DIRECTORIES: Directory[] = [
  {
    id: 1,
    directory_id: 1,
    name: 'Executive Office & Department Leadership',
    directory_name: 'Executive Office & Department Leadership',
    short_name: 'Executive Office',
    code: 'EXEC',
    directory_code: 'EXEC',
    amharic_name: 'የመምሪያ ኃላፊ ጽሕፈት ቤት',
    description: 'Supreme oversight, official seals, external government relations, and zonal strategic policy.',
    is_active: true,
  },
  {
    id: 2,
    directory_id: 2,
    name: 'Software Development & Systems Directorate',
    directory_name: 'Software Development & Systems Directorate',
    short_name: 'Software Directorate',
    code: 'SDSD',
    directory_code: 'SDSD',
    amharic_name: 'የሶፍትዌር ልማት እና ሲስተሞች ዳይሬክቶሬት',
    description: 'Engineering zonal portals, database infrastructure, and electronic workflow systems.',
    is_active: true,
  },
  {
    id: 3,
    directory_id: 3,
    name: 'IT Infrastructure & Network Administration Directorate',
    directory_name: 'IT Infrastructure & Network Administration Directorate',
    short_name: 'IT Infrastructure',
    code: 'ITID',
    directory_code: 'ITID',
    amharic_name: 'የኢንፎርሜሽን ቴክኖሎጂ መሠረተ ልማት ዳይሬክቶሬት',
    description: 'Data centers, fiber connectivity, municipal networking, and hardware procurement.',
    is_active: true,
  },
  {
    id: 4,
    directory_id: 4,
    name: 'Cybersecurity, Standards & Digital Governance Directorate',
    directory_name: 'Cybersecurity, Standards & Digital Governance Directorate',
    short_name: 'Cybersecurity Directorate',
    code: 'CSCD',
    directory_code: 'CSCD',
    amharic_name: 'የሳይበር ደህንነት እና ዲጂታል አስተዳደር ዳይሬክቶሬት',
    description: 'Audit compliance, digital signature keys, threat response, and data protection.',
    is_active: true,
  },
  {
    id: 5,
    directory_id: 5,
    name: 'Innovation, Research & Science Popularization',
    directory_name: 'Innovation, Research & Science Popularization',
    short_name: 'Innovation & Research',
    code: 'INNOV',
    directory_code: 'INNOV',
    amharic_name: 'የኢኖቬሽን፣ ምርምር እና ሳይንስ ማስፋፊያ',
    description: 'Youth science competitions, technology incubation centers, STEM research and school lab initiatives.',
    is_active: true,
  },
  {
    id: 6,
    directory_id: 6,
    name: 'Digital Literacy, Training & Capacity Building',
    directory_name: 'Digital Literacy, Training & Capacity Building',
    short_name: 'Capacity Building',
    code: 'CAP-BLD',
    directory_code: 'CAP-BLD',
    amharic_name: 'የዲጂታል እውቀት እና የአቅም ግንባታ',
    description: 'Civil servant computer literacy, woreda IT officer training and community technology access centers.',
    is_active: true,
  },
];

const STORAGE_KEY = 'hzsitd_custom_directories';

export function getStoredCustomDirectories(): Directory[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to read custom directories from localStorage', e);
    return [];
  }
}

export function saveStoredCustomDirectory(dir: Directory): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredCustomDirectories();
    const existingIdx = current.findIndex((d) => (d.id || d.directory_id) === (dir.id || dir.directory_id));
    let updated: Directory[];
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = dir;
    } else {
      updated = [dir, ...current];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('hzsitd_directories_updated'));
  } catch (e) {
    console.error('Failed to save custom directory to localStorage', e);
  }
}

export function mergeDirectories(remoteDirs: Directory[] | undefined | null): Directory[] {
  const remoteList = Array.isArray(remoteDirs) ? remoteDirs : [];
  const storedList = getStoredCustomDirectories();

  // Map to prevent duplicates by ID or Code
  const map = new Map<string, Directory>();

  // 1. First add DEFAULT_DIRECTORIES
  DEFAULT_DIRECTORIES.forEach((d) => {
    const keyId = String(d.id || d.directory_id);
    const keyCode = (d.code || d.directory_code || '').toUpperCase();
    map.set(`id:${keyId}`, d);
    if (keyCode) map.set(`code:${keyCode}`, d);
  });

  // 2. Add remote directories (overriding defaults if updated from backend)
  remoteList.forEach((d) => {
    const id = Number(d.id || d.directory_id);
    const code = (d.code || d.directory_code || '').toUpperCase();
    const normalized: Directory = {
      ...d,
      id,
      directory_id: id,
      name: d.name || d.directory_name || `Directorate #${id}`,
      directory_name: d.name || d.directory_name || `Directorate #${id}`,
      code: d.code || d.directory_code || 'DIR',
      directory_code: d.code || d.directory_code || 'DIR',
      short_name: d.short_name || d.code || d.name,
      is_active: d.is_active !== false,
    };
    map.set(`id:${id}`, normalized);
    if (code) map.set(`code:${code}`, normalized);
  });

  // 3. Add custom locally created directories
  storedList.forEach((d) => {
    const id = Number(d.id || d.directory_id);
    const code = (d.code || d.directory_code || '').toUpperCase();
    map.set(`id:${id}`, d);
    if (code) map.set(`code:${code}`, d);
  });

  // Deduplicate entries by unique ID
  const uniqueById = new Map<number, Directory>();
  map.forEach((dir) => {
    const dirId = Number(dir.id || dir.directory_id);
    if (!uniqueById.has(dirId)) {
      uniqueById.set(dirId, dir);
    }
  });

  return Array.from(uniqueById.values());
}
