import React, { useState, useEffect } from 'react';
import * as FaIcons from 'react-icons/fa';

import './FancyTable.css';


export type ColumnConfig = {
    key: string;
    label: string;
    sortable?: boolean;
    copyable?: boolean;
    render?: (value: any, row: any) => React.ReactNode;
};

interface FancyTableProps {
    data: any[];
    columns: ColumnConfig[];
    statusKey?: string;
    filterStatusValues?: string[];
    defaultSortKey?: string;
}

export const FancyTable: React.FC<FancyTableProps> = ({
    data,
    columns,
    statusKey,
    filterStatusValues,
    defaultSortKey,
}) => {
    const [filtered, setFiltered] = useState<any[]>([]);
    const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
    const [sortAsc, setSortAsc] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        let filteredData = [...data];

        // 🔍 Filter by status
        if (statusKey && statusFilter !== 'all') {
            filteredData = filteredData.filter((item) => item[statusKey] === statusFilter);
        }

        // 🔃 Sort by selected column
        if (sortKey) {
            filteredData.sort((a, b) => {
                const valA = a[sortKey];
                const valB = b[sortKey];
                return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
            });
        }

        setFiltered(filteredData);
    }, [data, sortKey, sortAsc, statusFilter, statusKey]);

    const handleCopy = (value: any) => {
        navigator.clipboard.writeText(String(value));
        alert(`Copied: ${value}`);
    };

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortAsc(!sortAsc);
        } else {
            setSortKey(key);
            setSortAsc(true);
        }
    };

    return (
        <>
            {/* 🔘 Optional dropdown filter */}
            {statusKey && filterStatusValues && (
                <div className="fancytable__filter mb-3">
                    <label className="me-2">Filter by status:</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="form-select w-auto d-inline-block"
                    >
                        <option value="all">All</option>
                        {filterStatusValues.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* 📊 Table */}
            <div className="table-container">
                <table className="fancy-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                    style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                                >
                                    {col.label}
                                    {col.sortable && sortKey === col.key && (
                                        <span className="ms-1">{sortAsc ? '▲' : '▼'}</span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {columns.map((col) => (
                                    <td key={col.key}>
                                        <div className="d-flex align-items-center">
                                            {col.render ? col.render(row[col.key], row) : row[col.key]}

                                            
                                            {col.copyable && (
                                                <span
                                                    className="copy-icon ms-2"
                                                    title="Copy"
                                                    role="button"
                                                    onClick={() => handleCopy(row[col.key])}
                                                >
                                                    <FaIcons.FaCopy />
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};
