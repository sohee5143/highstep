// Google Sheets API utilities - stub implementation
// Local JSON data is used instead

export const authenticate = async () => {
    console.log('Using local JSON data');
};

export const fetchData = async (sheetIndex: number = 0) => {
    return [];
};

export const updateData = async (sheetIndex: number = 0, rowIndex: number, data: any) => {
    console.log('Data updates stored locally');
};