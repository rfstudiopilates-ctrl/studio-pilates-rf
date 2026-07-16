import { useEffect, useId, useRef, useState } from 'react';
import ClientStatusBadge from './ClientStatusBadge';
import { Input } from '../ui/Input';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useClientsList } from '../../hooks/useClients';

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function ClientSearchSelect({
  label = 'Buscar cliente',
  value = null,
  onChange,
  status = 'active',
  placeholder = 'Nombre, usuario o teléfono',
  minChars = 2,
  limit = 8,
  disabled = false,
  autoFocus = false,
  error = '',
  className = '',
}) {
  const listId = useId();
  const containerRef = useRef(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const debouncedQuery = useDebouncedValue(query, 300);
  const searchTerm = debouncedQuery.trim();
  const canSearch = searchTerm.length >= minChars && !value;

  const { data: clientsData, isFetching } = useClientsList(
    {
      q: searchTerm || undefined,
      status: status || undefined,
      page: 1,
      limit,
      sortBy: 'fullName',
      sortOrder: 'asc',
    },
    {
      enabled: canSearch,
    }
  );

  const results = clientsData?.items || [];
  const showResults = canSearch && isOpen && results.length > 0;
  const showEmpty =
    canSearch && isOpen && !isFetching && results.length === 0 && searchTerm.length >= minChars;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [results]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  function selectClient(client) {
    onChange?.(client);
    setQuery(client.fullName || '');
    setIsOpen(false);
  }

  function clearSelection() {
    onChange?.(null);
    setQuery('');
    setIsOpen(false);
  }

  function handleQueryChange(event) {
    const nextValue = event.target.value;
    setQuery(nextValue);

    if (value) {
      onChange?.(null);
    }

    setIsOpen(true);
  }

  function handleKeyDown(event) {
    if (!showResults) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => (current - 1 + results.length) % results.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const client = results[highlightedIndex];
      if (client) {
        selectClient(client);
      }
      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Input
        label={label}
        placeholder={placeholder}
        value={value ? value.fullName : query}
        onChange={handleQueryChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoFocus={autoFocus}
        error={error}
        autoComplete="off"
        role="combobox"
        aria-expanded={showResults}
        aria-controls={listId}
        aria-autocomplete="list"
        suffix={
          value || query ? (
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg px-1.5 py-1 text-xs font-medium text-text-muted hover:bg-surface-muted hover:text-text"
              aria-label="Limpiar cliente"
            >
              Limpiar
            </button>
          ) : null
        }
      />

      {value ? (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-200 text-xs font-semibold text-text">
            {getInitials(value.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">{value.fullName}</p>
            <p className="truncate text-xs text-text-muted">
              @{value.username}
              {value.phone ? ` · ${value.phone}` : ''}
            </p>
          </div>
          {value.status ? <ClientStatusBadge status={value.status} /> : null}
        </div>
      ) : null}

      {isFetching && canSearch ? (
        <p className="mt-2 text-xs text-text-muted">Buscando clientes...</p>
      ) : null}

      {query.trim().length > 0 && query.trim().length < minChars && !value ? (
        <p className="mt-2 text-xs text-text-muted">
          Escribí al menos {minChars} caracteres para buscar.
        </p>
      ) : null}

      {showEmpty ? (
        <p className="mt-2 text-xs text-text-muted">No se encontraron clientes.</p>
      ) : null}

      {showResults ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-56 w-full space-y-1 overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-[0_12px_40px_rgba(26,26,26,0.12)]"
        >
          {results.map((client, index) => {
            const isActive = index === highlightedIndex;

            return (
              <li key={client.id} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectClient(client)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    isActive ? 'bg-brand-50' : 'hover:bg-surface-muted'
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs font-semibold">
                    {getInitials(client.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{client.fullName}</p>
                    <p className="truncate text-xs text-text-muted">
                      @{client.username}
                      {client.phone ? ` · ${client.phone}` : ''}
                    </p>
                  </div>
                  <ClientStatusBadge status={client.status} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
