import { Employee } from './types';

export const INITIAL_EMPLOYEES: Employee[] = [
  { 
    id: '1', 
    firstName: 'Mária', 
    lastName: 'Jakubová', 
    fixedLine: '0961632940', 
    mobile: '0903804579', 
    note: 'súkromný mobil - 0903550817' 
  },
  { 
    id: '2', 
    firstName: 'Marek', 
    lastName: 'Gregáň', 
    fixedLine: '0961632942', 
    mobile: '0903804579', 
    note: 'služobný mobil - 0903479693' 
  },
  { 
    id: '3', 
    firstName: 'Lukáš', 
    lastName: 'Balga', 
    fixedLine: '0961632941', 
    mobile: '0903804579', 
    note: 'súkromný mobil - 0903546416' 
  },
];

export const STORAGE_KEYS = {
  SETTINGS: 'pohotovost_settings_v1',
};