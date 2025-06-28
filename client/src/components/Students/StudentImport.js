import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CSVLink } from 'react-csv';
import './Students.css'

const StudentImport = () => { 
    const [selectedFile, setSelectedFile] = useState(null);
    const [importStatus, setImportStatus] = useState(null); // 'success', 'partial_success', 'failed'
    const [importMessage, setImportMessage] = useState('');
    const [failedRows, setFailedRows] = useState([]);
    const [summary, setSummary] = useState(null); // To store successful/failed counts from backend

    const fileInputRef = useRef(null); // Ref to clear the file input
    const navigate = useNavigate();

    const csvHeaders = [
        { label: "First Name", key: "First Name" },
        { label: "Last Name", key: "Last Name" },
        { label: "Date of Birth", key: "Date of Birth" }, // Format: YYYY-MM-DD
        { label: "Gender", key: "Gender" }, // Options: Male, Female, Other, Prefer not to say
        { label: "Grade Level", key: "Grade Level" },
        { label: "Attendance %", key: "Attendance %" }, // Number between 0-100
        { label: "Average Grade", key: "Average Grade" }, // Number between 0-100
        { label: "Behavioral Incidents", key: "Behavioral Incidents" }, // Non-negative integer
        { label: "Notes", key: "Notes" },
    ];

    // Empty data for the template download (just provides headers)
    const emptyTemplateData = [{}];

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        // Clear previous import status when a new file is selected
        setImportStatus(null);
        setImportMessage('');
        setFailedRows([]);
        setSummary(null);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert('Please select a CSV file to upload.');
            return;
        }

    setImportStatus('uploading');
    setImportMessage('Uploading and processing...');
    setFailedRows([]);
    setSummary(null);

    const formData = new FormData();
    formData.append('studentFile', selectedFile);

    try {
        const response = await fetch('/api/students/import', {
        method: 'POST',
        headers: {
          'x-auth-token': localStorage.getItem('token'), 
        },
        body: formData, 
        });

        const data = await response.json(); 

        if (response.ok) { 
            setImportStatus(data.status); // 'success', 'partial_success', 'failed'
        setImportMessage(data.message);
        setFailedRows(data.failedRows || []);
        setSummary(data.summary);
      } else { // Backend responded with an error status (e.g., 400, 500)
        setImportStatus('failed');
        setImportMessage(data.msg || data.message || 'An unknown error occurred during import.');
        setFailedRows(data.failedRows || []); // Even failed general requests might send failedRows
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setImportStatus('failed');
      setImportMessage('Network error or server unreachable. Please check your connection and try again.');
      setFailedRows([]);
    } finally {
        // Clear the file input regardless of success/failure
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setSelectedFile(null); // Clear selected file state
    }
  };

  return (
    
    <div className="student-import-container"> 
      <h2>Import Students from CSV</h2>

      <p className="student-import-instructions"> 
        Use this page to upload a CSV file containing student data. Ensure your CSV file
        has the exact column headers specified below and follows the required formats.
      </p>

      <h3>Required CSV Columns & Formats:</h3>
      <ul className="student-import-list"> 
        <li><strong>First Name</strong> (Text, Required)</li>
        <li><strong>Last Name</strong> (Text, Required)</li>
        <li><strong>Date of Birth</strong> (Date, Format - YYYY-MM-DD, Required)</li>
        <li><strong>Gender</strong>(Text, Options - Male, Female, Other, Prefer not to say, Required)</li>
        <li><strong>Grade Level</strong> (Number, Range 1-12, Required)</li>
        <li><strong>Attendance Percentage</strong> (Number, Range 0-100, Required)</li>
        <li><strong>Average Grade</strong> (Number, Range 0-100, Required)</li>
        <li><strong>Behavioral Incidents</strong> (Number, Range greater than 0, Required)</li>
        <li><strong>Notes</strong> (Text)</li>
      </ul>
      <p className="student-import-tip"> 
        <strong>Tip:</strong> Download the pre-formatted template to ensure correct column headers.
      </p>

      <div className="student-import-button-group"> 
        <CSVLink
          data={emptyTemplateData}
          headers={csvHeaders}
          filename={"student_import_template.csv"}
          className="button primary student-import-template-button" 
          target="_blank"
        >
          Download CSV Template
        </CSVLink>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="student-import-file-input"
        />
        <button
          onClick={handleUpload}
          disabled={!selectedFile || importStatus === 'uploading'}
          className="student-import-upload-button"
        >
          {importStatus === 'uploading' ? 'Uploading...' : 'Import CSV'}
        </button>
      </div>

      {importMessage && (
        <div className={`student-import-message-box ${ // Conditional class for success/error
            importStatus === 'success' ? 'student-import-success-box' :
            (importStatus === 'failed' ? 'student-import-error-box' : 'student-import-info-box')
        }`}>
          <p>{importMessage}</p>
          {summary && (
            <p>
              Summary: Processed {summary.totalRowsProcessed} rows, {summary.successfulImports} successful, {summary.failedImports} failed.
            </p>
          )}
        </div>
      )}

      {failedRows.length > 0 && (
        <div className="student-import-failed-rows-container"> 
          <h3>Details for Failed Rows:</h3>
          {failedRows.map((rowDetail, index) => (
            <div key={index} className="student-import-failed-row-item"> 
              <p><strong>Original Row {rowDetail.rowNumber}:</strong></p>
              <pre className="student-import-original-data-pre">{JSON.stringify(rowDetail.originalData, null, 2)}</pre>
              <ul className="student-import-errors-list"> 
                {rowDetail.errors.map((error, errIndex) => (
                  <li key={errIndex} className="student-import-error-text">- {error}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => navigate('/students')} className="student-import-back-button">
        Back to Student List
      </button>
    </div>
    );
}
export default StudentImport;