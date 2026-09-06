import os
import io
import abc
import hashlib
from django.conf import settings
from django.utils import timezone


class StorageProvider(abc.ABC):
    """
    Abstract storage provider interface for enterprise document management.
    Allows seamless switching between AWS S3 (Production) and Local/MinIO (Development/Testing).
    """

    @abc.abstractmethod
    def generate_upload_url(self, storage_key, mime_type, expires_in=900):
        """Generates a secure presigned upload URL or endpoint."""
        pass

    @abc.abstractmethod
    def generate_download_url(self, storage_key, original_filename=None, expires_in=900):
        """Generates a secure, short-lived presigned download URL."""
        pass

    @abc.abstractmethod
    def initiate_multipart_upload(self, storage_key, mime_type):
        """Initiates S3 multipart upload session."""
        pass

    @abc.abstractmethod
    def generate_presigned_part_url(self, storage_key, upload_id, part_number, expires_in=900):
        """Generates presigned URL for a specific multipart part."""
        pass

    @abc.abstractmethod
    def complete_multipart_upload(self, storage_key, upload_id, parts):
        """Completes multipart upload with part list."""
        pass

    @abc.abstractmethod
    def abort_multipart_upload(self, storage_key, upload_id):
        """Aborts multipart upload."""
        pass

    @abc.abstractmethod
    def upload_bytes(self, storage_key, content_bytes, mime_type='application/pdf'):
        """Directly writes bytes to storage."""
        pass

    @abc.abstractmethod
    def get_object_bytes(self, storage_key):
        """Retrieves raw object bytes."""
        pass

    @abc.abstractmethod
    def exists(self, storage_key):
        """Checks if object exists in storage."""
        pass

    @abc.abstractmethod
    def delete(self, storage_key):
        """Deletes object from storage."""
        pass

    @abc.abstractmethod
    def get_metadata(self, storage_key):
        """Retrieves object metadata (size, hash, encryption, mime)."""
        pass


class S3StorageProvider(StorageProvider):
    """
    Production AWS S3 Storage Provider with Server-Side Encryption (SSE-KMS / SSE-S3),
    presigned direct uploads, multipart upload tracking, and private bucket isolation.
    """

    def __init__(self):
        import boto3
        from botocore.config import Config

        self.bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'tenderx-documents')
        self.region = getattr(settings, 'AWS_REGION', 'us-east-1')
        self.kms_key_id = getattr(settings, 'AWS_KMS_KEY_ID', None)
        endpoint_url = getattr(settings, 'AWS_S3_CUSTOM_ENDPOINT', None) or None

        session = boto3.session.Session()
        config = Config(
            signature_version='s3v4',
            region_name=self.region,
            s3={'addressing_style': 'virtual'}
        )

        client_kwargs = {
            'service_name': 's3',
            'config': config,
        }
        if endpoint_url:
            client_kwargs['endpoint_url'] = endpoint_url

        access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
        secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
        if access_key and secret_key:
            client_kwargs['aws_access_key_id'] = access_key
            client_kwargs['aws_secret_access_key'] = secret_key

        self.s3_client = session.client(**client_kwargs)

    def generate_upload_url(self, storage_key, mime_type, expires_in=900):
        params = {
            'Bucket': self.bucket,
            'Key': storage_key,
            'ContentType': mime_type,
        }
        if self.kms_key_id:
            params['ServerSideEncryption'] = 'aws:kms'
            params['SSEKMSKeyId'] = self.kms_key_id
        else:
            params['ServerSideEncryption'] = 'AES256'

        url = self.s3_client.generate_presigned_url(
            ClientMethod='put_object',
            Params=params,
            ExpiresIn=expires_in
        )
        return {
            'upload_url': url,
            'method': 'PUT',
            'storage_key': storage_key,
            'expires_in': expires_in,
            'headers': {
                'Content-Type': mime_type,
                'x-amz-server-side-encryption': 'aws:kms' if self.kms_key_id else 'AES256'
            }
        }

    def generate_download_url(self, storage_key, original_filename=None, expires_in=900):
        params = {
            'Bucket': self.bucket,
            'Key': storage_key,
        }
        if original_filename:
            params['ResponseContentDisposition'] = f'attachment; filename="{original_filename}"'

        url = self.s3_client.generate_presigned_url(
            ClientMethod='get_object',
            Params=params,
            ExpiresIn=expires_in
        )
        return {
            'download_url': url,
            'expires_in': expires_in
        }

    def initiate_multipart_upload(self, storage_key, mime_type):
        params = {
            'Bucket': self.bucket,
            'Key': storage_key,
            'ContentType': mime_type,
        }
        if self.kms_key_id:
            params['ServerSideEncryption'] = 'aws:kms'
            params['SSEKMSKeyId'] = self.kms_key_id
        else:
            params['ServerSideEncryption'] = 'AES256'

        response = self.s3_client.create_multipart_upload(**params)
        return {
            'upload_id': response['UploadId'],
            'storage_key': storage_key,
            'bucket': self.bucket
        }

    def generate_presigned_part_url(self, storage_key, upload_id, part_number, expires_in=900):
        url = self.s3_client.generate_presigned_url(
            ClientMethod='upload_part',
            Params={
                'Bucket': self.bucket,
                'Key': storage_key,
                'UploadId': upload_id,
                'PartNumber': part_number
            },
            ExpiresIn=expires_in
        )
        return {
            'part_number': part_number,
            'upload_url': url,
            'expires_in': expires_in
        }

    def complete_multipart_upload(self, storage_key, upload_id, parts):
        multipart_dict = {
            'Parts': sorted(parts, key=lambda p: p['PartNumber'])
        }
        return self.s3_client.complete_multipart_upload(
            Bucket=self.bucket,
            Key=storage_key,
            UploadId=upload_id,
            MultipartUpload=multipart_dict
        )

    def abort_multipart_upload(self, storage_key, upload_id):
        return self.s3_client.abort_multipart_upload(
            Bucket=self.bucket,
            Key=storage_key,
            UploadId=upload_id
        )

    def upload_bytes(self, storage_key, content_bytes, mime_type='application/pdf'):
        kwargs = {
            'Bucket': self.bucket,
            'Key': storage_key,
            'Body': content_bytes,
            'ContentType': mime_type,
        }
        if self.kms_key_id:
            kwargs['ServerSideEncryption'] = 'aws:kms'
            kwargs['SSEKMSKeyId'] = self.kms_key_id
        else:
            kwargs['ServerSideEncryption'] = 'AES256'
        self.s3_client.put_object(**kwargs)
        return storage_key

    def get_object_bytes(self, storage_key):
        response = self.s3_client.get_object(Bucket=self.bucket, Key=storage_key)
        return response['Body'].read()

    def exists(self, storage_key):
        try:
            self.s3_client.head_object(Bucket=self.bucket, Key=storage_key)
            return True
        except Exception:
            return False

    def delete(self, storage_key):
        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=storage_key)
            return True
        except Exception:
            return False

    def get_metadata(self, storage_key):
        head = self.s3_client.head_object(Bucket=self.bucket, Key=storage_key)
        return {
            'size': head.get('ContentLength', 0),
            'content_type': head.get('ContentType', 'application/octet-stream'),
            'etag': head.get('ETag', '').strip('"'),
            'encryption': head.get('ServerSideEncryption', 'AES256')
        }


class LocalStorageProvider(StorageProvider):
    """
    Local & CI/CD Development Storage Provider.
    Implements full StorageProvider contract with local media disk persistence,
    hash calculation, simulation of presigned URLs, and multipart chunk concatenation.
    """

    def __init__(self):
        self.bucket = 'local-storage-bucket'

    @property
    def documents_dir(self):
        base = getattr(settings, 'MEDIA_ROOT', os.path.join(settings.BASE_DIR, 'media'))
        d = os.path.join(base, 'documents')
        os.makedirs(d, exist_ok=True)
        return d

    def _get_abs_path(self, storage_key):
        clean_key = storage_key.lstrip('/').replace('/', os.sep)
        full_path = os.path.abspath(os.path.normpath(os.path.join(self.documents_dir, clean_key)))
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        if os.name == 'nt' and not full_path.startswith('\\\\?\\') and len(full_path) >= 240:
            full_path = '\\\\?\\' + full_path
        return full_path

    def generate_upload_url(self, storage_key, mime_type, expires_in=900):
        return {
            'upload_url': f"/api/v1/documents/storage/direct-upload/?key={storage_key}",
            'method': 'POST',
            'storage_key': storage_key,
            'expires_in': expires_in,
            'headers': {'Content-Type': mime_type}
        }

    def generate_download_url(self, storage_key, original_filename=None, expires_in=900):
        filename_param = f"&filename={original_filename}" if original_filename else ""
        return {
            'download_url': f"/api/v1/documents/storage/direct-download/?key={storage_key}{filename_param}",
            'expires_in': expires_in
        }

    def initiate_multipart_upload(self, storage_key, mime_type):
        upload_id = hashlib.md5(f"{storage_key}:{timezone.now().timestamp()}".encode()).hexdigest()
        temp_parts_dir = os.path.join(self.documents_dir, '.parts', upload_id)
        os.makedirs(temp_parts_dir, exist_ok=True)
        return {
            'upload_id': upload_id,
            'storage_key': storage_key,
            'bucket': self.bucket
        }

    def generate_presigned_part_url(self, storage_key, upload_id, part_number, expires_in=900):
        return {
            'part_number': part_number,
            'upload_url': f"/api/v1/documents/storage/multipart-part/?key={storage_key}&upload_id={upload_id}&part={part_number}",
            'expires_in': expires_in
        }

    def complete_multipart_upload(self, storage_key, upload_id, parts):
        target_path = self._get_abs_path(storage_key)
        temp_parts_dir = os.path.join(self.documents_dir, '.parts', upload_id)

        sorted_parts = sorted(parts, key=lambda p: p['PartNumber'])
        with open(target_path, 'wb') as outfile:
            for part in sorted_parts:
                part_num = part['PartNumber']
                part_file = os.path.join(temp_parts_dir, f"part_{part_num}")
                if os.path.exists(part_file):
                    with open(part_file, 'rb') as infile:
                        outfile.write(infile.read())
                    try:
                        os.remove(part_file)
                    except OSError:
                        pass
        try:
            os.rmdir(temp_parts_dir)
        except OSError:
            pass

        return {'status': 'Completed', 'storage_key': storage_key}

    def abort_multipart_upload(self, storage_key, upload_id):
        temp_parts_dir = os.path.join(self.documents_dir, '.parts', upload_id)
        if os.path.exists(temp_parts_dir):
            import shutil
            shutil.rmtree(temp_parts_dir, ignore_errors=True)
        return {'status': 'Aborted'}

    def upload_bytes(self, storage_key, content_bytes, mime_type='application/pdf'):
        abs_path = self._get_abs_path(storage_key)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, 'wb') as f:
            f.write(content_bytes)
        return storage_key

    def get_object_bytes(self, storage_key):
        abs_path = self._get_abs_path(storage_key)
        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"Storage key {storage_key} not found")
        with open(abs_path, 'rb') as f:
            return f.read()

    def exists(self, storage_key):
        abs_path = self._get_abs_path(storage_key)
        return os.path.exists(abs_path)

    def delete(self, storage_key):
        abs_path = self._get_abs_path(storage_key)
        if os.path.exists(abs_path):
            try:
                os.remove(abs_path)
                return True
            except OSError:
                return False
        return True

    def get_metadata(self, storage_key):
        abs_path = self._get_abs_path(storage_key)
        if not os.path.exists(abs_path):
            return {'size': 0, 'content_type': 'application/octet-stream', 'encryption': 'Local'}
        size = os.path.getsize(abs_path)
        with open(abs_path, 'rb') as f:
            h = hashlib.sha256(f.read()).hexdigest()
        return {
            'size': size,
            'content_type': 'application/pdf',
            'etag': h,
            'encryption': 'Local-AES256'
        }


def get_storage_provider() -> StorageProvider:
    """Factory resolver returning configured storage provider."""
    provider_config = getattr(settings, 'STORAGE_PROVIDER', 'AUTO').upper()
    has_aws_keys = bool(getattr(settings, 'AWS_ACCESS_KEY_ID', None) and getattr(settings, 'AWS_SECRET_ACCESS_KEY', None))

    if provider_config == 'S3' or (provider_config == 'AUTO' and has_aws_keys):
        try:
            return S3StorageProvider()
        except Exception:
            return LocalStorageProvider()
    return LocalStorageProvider()
