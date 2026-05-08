/**
 * components/ui/SearchableSelect.tsx
 * Komponen Dropdown yang dapat dicari (Searchable Select).
 * Dibangun menggunakan react-select dengan custom styling agar selaras dengan desain Gridas Sakti.
 */

import Select from 'react-select';
import type { Props as SelectProps, StylesConfig } from 'react-select';

interface SearchableSelectProps extends Omit<SelectProps, 'styles'> {
  label?: string;
  error?: string;
}

const SearchableSelect = ({ label, error, ...props }: SearchableSelectProps) => {
  // Custom styles untuk react-select agar mirip dengan .form-input di index.css
  const customStyles: StylesConfig = {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'var(--gray-50)',
      borderColor: state.isFocused ? 'var(--brand-500)' : 'var(--gray-200)',
      borderWidth: '1.5px',
      borderRadius: 'var(--radius-lg)',
      padding: '2px 4px', // Mendekati padding .form-input
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? 'var(--brand-500)' : 'var(--gray-300)',
      },
      transition: 'all 0.2s',
      minHeight: '46px',
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 8px',
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--gray-400)',
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--gray-900)',
      fontWeight: '500',
    }),
    menu: (base) => ({
      ...base,
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-lg)',
      border: '1px solid var(--gray-100)',
      padding: '4px',
      zIndex: 100,
      overflow: 'hidden',
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: 'var(--radius-md)',
      fontSize: '13.5px',
      fontWeight: '500',
      padding: '10px 12px',
      backgroundColor: state.isSelected 
        ? 'var(--brand-500)' 
        : state.isFocused 
          ? 'var(--brand-50)' 
          : 'transparent',
      color: state.isSelected 
        ? 'white' 
        : state.isFocused 
          ? 'var(--brand-600)' 
          : 'var(--gray-700)',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'var(--brand-100)',
      },
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? 'var(--brand-500)' : 'var(--gray-400)',
      '&:hover': {
        color: 'var(--brand-600)',
      },
    }),
  };

  return (
    <div className="w-full">
      {label && <label className="form-label mb-1.5 block">{label}</label>}
      <Select
        {...props}
        styles={customStyles}
        noOptionsMessage={() => "Data tidak ditemukan"}
        loadingMessage={() => "Mencari..."}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
      />
      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
};

export default SearchableSelect;
