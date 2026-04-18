"""Tests for document upload, download, and deletion."""

import base64
import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_upload_document_resume(client, test_user, test_app_id):
    """Test uploading a resume document."""
    _, cookies = test_user
    pdf_content = b"%PDF-1.0\n% Test PDF"
    b64_content = base64.b64encode(pdf_content).decode()
    
    response = await client.post(
        f"/api/applications/{test_app_id}/documents/resume",
        json={
            "filename": "resume.pdf",
            "content_base64": b64_content,
            "content_type": "application/pdf",
        },
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["filename"] == "resume.pdf"
    assert data["content_type"] == "application/pdf"


async def test_upload_document_cover_letter(client, test_user, test_app_id):
    """Test uploading a cover letter document."""
    _, cookies = test_user
    docx_content = b"PK\x03\x04" + b"X" * 100  # Minimal DOCX structure
    b64_content = base64.b64encode(docx_content).decode()
    
    response = await client.post(
        f"/api/applications/{test_app_id}/documents/cover_letter",
        json={
            "filename": "cover_letter.docx",
            "content_base64": b64_content,
            "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["filename"] == "cover_letter.docx"


async def test_download_document(client, test_user, test_app_id):
    """Test downloading a previously uploaded document."""
    _, cookies = test_user
    pdf_content = b"%PDF-1.0"
    b64_content = base64.b64encode(pdf_content).decode()
    
    # Upload first
    await client.post(
        f"/api/applications/{test_app_id}/documents/resume",
        json={
            "filename": "resume.pdf",
            "content_base64": b64_content,
            "content_type": "application/pdf",
        },
        cookies=cookies,
    )
    
    # Download
    response = await client.get(
        f"/api/applications/{test_app_id}/documents/resume",
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["filename"] == "resume.pdf"
    assert data["content_base64"] == b64_content
    assert data["content_type"] == "application/pdf"


async def test_download_nonexistent_document(client, test_user, test_app_id):
    """Test downloading a document that doesn't exist."""
    _, cookies = test_user
    response = await client.get(
        f"/api/applications/{test_app_id}/documents/resume",
        cookies=cookies,
    )
    
    assert response.status_code == 404


async def test_upload_invalid_content_type(client, test_user, test_app_id):
    """Test rejection of invalid content types."""
    _, cookies = test_user
    b64_content = base64.b64encode(b"test").decode()
    
    response = await client.post(
        f"/api/applications/{test_app_id}/documents/resume",
        json={
            "filename": "invalid.txt",
            "content_base64": b64_content,
            "content_type": "text/plain",
        },
        cookies=cookies,
    )
    
    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"]["error"]["message"]


async def test_upload_oversized_document(client, test_user, test_app_id):
    """Test rejection of documents exceeding 2MB."""
    _, cookies = test_user
    # Create content larger than 2MB
    large_content = "X" * (2_097_152 + 1000)
    b64_content = base64.b64encode(large_content.encode()).decode()
    
    response = await client.post(
        f"/api/applications/{test_app_id}/documents/resume",
        json={
            "filename": "toolarge.pdf",
            "content_base64": b64_content,
            "content_type": "application/pdf",
        },
        cookies=cookies,
    )
    
    assert response.status_code == 400
    assert "exceeds" in response.json()["detail"]["error"]["message"]


async def test_delete_document(client, test_user, test_app_id):
    """Test deleting a document."""
    _, cookies = test_user
    pdf_content = b"%PDF-1.0"
    b64_content = base64.b64encode(pdf_content).decode()
    
    # Upload first
    await client.post(
        f"/api/applications/{test_app_id}/documents/resume",
        json={
            "filename": "resume.pdf",
            "content_base64": b64_content,
            "content_type": "application/pdf",
        },
        cookies=cookies,
    )
    
    # Delete
    response = await client.delete(
        f"/api/applications/{test_app_id}/documents/resume",
        cookies=cookies,
    )
    
    assert response.status_code == 200
    assert response.json()["data"]["deleted"] is True
    
    # Verify it's gone
    response = await client.get(
        f"/api/applications/{test_app_id}/documents/resume",
        cookies=cookies,
    )
    assert response.status_code == 404


async def test_replace_document(client, test_user, test_app_id):
    """Test replacing an existing document."""
    _, cookies = test_user
    pdf_content = b"%PDF-1.0"
    b64_content1 = base64.b64encode(pdf_content).decode()
    
    # Upload first
    await client.post(
        f"/api/applications/{test_app_id}/documents/resume",
        json={
            "filename": "resume_v1.pdf",
            "content_base64": b64_content1,
            "content_type": "application/pdf",
        },
        cookies=cookies,
    )
    
    # Upload replacement
    pdf_content2 = b"%PDF-1.0\n% Updated"
    b64_content2 = base64.b64encode(pdf_content2).decode()
    
    response = await client.post(
        f"/api/applications/{test_app_id}/documents/resume",
        json={
            "filename": "resume_v2.pdf",
            "content_base64": b64_content2,
            "content_type": "application/pdf",
        },
        cookies=cookies,
    )
    
    assert response.status_code == 200
    
    # Verify replacement
    response = await client.get(
        f"/api/applications/{test_app_id}/documents/resume",
        cookies=cookies,
    )
    
    data = response.json()["data"]
    assert data["filename"] == "resume_v2.pdf"
    assert data["content_base64"] == b64_content2


async def test_document_isolation_between_users(client, test_user, other_user, test_app_id):
    """Test that documents are isolated between users."""
    user1, cookies1 = test_user
    user2, cookies2 = other_user
    pdf_content = b"%PDF-1.0"
    b64_content = base64.b64encode(pdf_content).decode()
    
    # User 1 uploads a document
    await client.post(
        f"/api/applications/{test_app_id}/documents/resume",
        json={
            "filename": "resume.pdf",
            "content_base64": b64_content,
            "content_type": "application/pdf",
        },
        cookies=cookies1,
    )
    
    # User 2 tries to access it - should fail
    response = await client.get(
        f"/api/applications/{test_app_id}/documents/resume",
        cookies=cookies2,
    )
    
    assert response.status_code == 404
