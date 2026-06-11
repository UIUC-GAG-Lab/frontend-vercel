import React from 'react';
import TopFilter from '../ui/TopFilter';

function ResultsTable() {
	return (
		<div className="bg-white rounded-lg border border-gray-200 px-4 py-4 mt-3">
			<div className="space-y-3 text-gray-500">
                Results will Come here..
			</div>
		</div>
	);
}

export default function HomeV2({ addLog, mqttConnected }) {
	const handleFilterChange = () => {};

	const handleExport = () => {
		addLog && addLog('Export CSV requested');
	};

	return (
		<div className="p-2">
			
				<TopFilter 
                    onFilterChange={handleFilterChange} 
                    onExport={handleExport} />

                <ResultsTable />
		</div>
	);
}

