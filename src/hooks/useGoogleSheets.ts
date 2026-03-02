import { useState } from 'react';

const useGoogleSheets = (spreadsheetId: string) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateData = async (newData: any[]) => {
        try {
            setData(newData);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
        }
    };

    return { data, loading, error, updateData };
};

export default useGoogleSheets;