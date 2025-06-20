import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import QrCode from '../../components/ui/QrCode';
import ImageUpload from '../../components/ui/ImageUpload';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye,
  Link,
  QrCode as QrIcon,
  Edit,
  Image as ImageIcon,
  Film
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdContent {
  headline?: string;
  subheadline?: string;
  redirectUrl?: string;
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
}

interface AdDesign {
  id: string;
  name: string;
  template: string;
  created_at: string;
  background: string;
  content: AdContent;
  image_url?: string;
  ad_space_id?: string;
  ad_spaces?: {
    id: string;
    title: string;
    content: AdContent;
  } | null;
}

interface AdFormState {
  name: string;
  headline: string;
  subheadline: string;
  background: string;
  redirectUrl: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

type ViewMode = 'list' | 'create' | 'detail' | 'edit';
type AdMode = 'custom' | 'redirect';

const AdBuilder = () => {
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDesign, setSelectedDesign] = useState<AdDesign | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savedDesigns, setSavedDesigns] = useState<AdDesign[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [adMode, setAdMode] = useState<AdMode>('redirect');
  const [adForm, setAdForm] = useState<AdFormState>({
    name: '',
    headline: '',
    subheadline: '',
    background: '#FFFFFF',
    redirectUrl: '',
    mediaUrl: '',
    mediaType: 'image'
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_designs')
        .select(`
          *,
          ad_spaces (
            id,
            title,
            content
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedDesigns(data || []);
    } catch (error) {
      toast.error('Failed to load designs');
      console.error('Error loading designs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQrUrl = (adId: string) => {
    return `${window.location.origin}/view?ad=${adId}`;
  };

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    
    // Check if it's an image or video
    const fileType = file.type.startsWith('image/') ? 'image' : 'video';
    
    // Create a temporary URL for preview
    const previewUrl = URL.createObjectURL(file);
    setAdForm({
      ...adForm,
      mediaUrl: previewUrl,
      mediaType: fileType
    });
  };

  const uploadMediaToStorage = async (file: File): Promise<string> => {
    if (!file) return '';
    
    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('ad_images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('ad_images')
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload media');
      return '';
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!adForm.name) {
      toast.error('Please provide a name for your ad');
      return false;
    }

    // Only validate redirect URL for redirect mode
    if (adMode === 'redirect' && !adForm.redirectUrl) {
      toast.error('Please provide a redirect URL');
      return false;
    }

    // For custom mode, validate media upload
    if (adMode === 'custom' && !uploadedFile && !adForm.mediaUrl) {
      toast.error('Please upload an image or video');
      return false;
    }

    return true;
  };

  const handleSaveAd = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      // Upload file if there's a new one
      let mediaUrl = adForm.mediaUrl;
      if (uploadedFile) {
        mediaUrl = await uploadMediaToStorage(uploadedFile);
        if (!mediaUrl) {
          throw new Error('Failed to upload media');
        }
      }

      const adSpaceContent = adMode === 'custom' 
        ? { mediaType: adForm.mediaType, mediaUrl: mediaUrl }
        : { url: adForm.redirectUrl };

      const adContent = adMode === 'custom'
        ? { mediaType: adForm.mediaType, mediaUrl: mediaUrl }
        : { redirectUrl: adForm.redirectUrl };

      const adDescription = adMode === 'custom' 
        ? 'Custom media ad' 
        : `Ad space for ${adForm.name}`;

      if (selectedDesign && viewMode === 'edit') {
        // Update existing ad design and ad space
        const { data: adSpace, error: adSpaceError } = await supabase
          .from('ad_spaces')
          .update({
            title: adForm.name,
            description: adDescription,
            content: adSpaceContent,
            theme: {
              backgroundColor: adForm.background,
              textColor: '#FFFFFF'
            }
          })
          .eq('id', selectedDesign.ad_space_id || '')
          .select()
          .single();

        if (adSpaceError) throw adSpaceError;

        const { data: adDesign, error: adError } = await supabase
          .from('ad_designs')
          .update({
            name: adForm.name,
            background: adForm.background,
            content: adContent
          })
          .eq('id', selectedDesign.id)
          .select(`
            *,
            ad_spaces (
              id,
              title,
              content
            )
          `)
          .single();

        if (adError) throw adError;

        // Update the ad in the list
        setSavedDesigns(prev => prev.map(design => 
          design.id === adDesign.id ? adDesign : design
        ));
        
        toast.success('Ad design updated!');
      } else {
        // First create the ad space
        const { data: adSpace, error: adSpaceError } = await supabase
          .from('ad_spaces')
          .insert([{
            user_id: user?.id,
            title: adForm.name,
            description: adDescription,
            content: adSpaceContent,
            theme: {
              backgroundColor: adForm.background,
              textColor: '#FFFFFF'
            }
          }])
          .select()
          .single();

        if (adSpaceError) throw adSpaceError;

        // Then create the ad design linked to the ad space
        const { data: adDesign, error: adError } = await supabase
          .from('ad_designs')
          .insert([{
            user_id: user?.id,
            name: adForm.name,
            background: adForm.background,
            content: adContent,
            ad_space_id: adSpace.id
          }])
          .select(`
            *,
            ad_spaces (
              id,
              title,
              content
            )
          `)
          .single();

        if (adError) throw adError;

        setSavedDesigns(prev => [adDesign, ...prev]);
        toast.success('Ad design created!');
      }
      
      setViewMode('list');
      
      // Reset form
      resetForm();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save design');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setAdForm({
      name: '',
      headline: '',
      subheadline: '',
      background: '#FFFFFF',
      redirectUrl: '',
      mediaUrl: '',
      mediaType: 'image'
    });
    setAdMode('redirect');
    setSelectedDesign(null);
    setUploadedFile(null);
  };

  const handleDeleteAd = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ad_designs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSavedDesigns(prev => prev.filter(design => design.id !== id));
      if (selectedDesign?.id === id) {
        setSelectedDesign(null);
        setViewMode('list');
      }
      toast.success('Design deleted');
    } catch (error) {
      toast.error('Failed to delete design');
    }
  };

  const handleEditAd = (design: AdDesign) => {
    setSelectedDesign(design);
    
    // Determine if it's a redirect-only ad or a custom ad
    const isRedirectMode = !design.content.mediaUrl && 
      (design.content.redirectUrl || design.ad_spaces?.content?.url);
    
    setAdMode(isRedirectMode ? 'redirect' : 'custom');
    
    // Populate the form with the design data
    setAdForm({
      name: design.name,
      headline: design.content.headline || '',
      subheadline: design.content.subheadline || '',
      background: design.background || '#FFFFFF',
      redirectUrl: design.content.redirectUrl || design.ad_spaces?.content?.url || '',
      mediaUrl: design.content.mediaUrl || design.ad_spaces?.content?.mediaUrl || '',
      mediaType: design.content.mediaType || 'image'
    });
    
    setViewMode('edit');
  };

  // Component for rendering the media in preview or detail view
  const MediaPreview = ({ 
    mediaUrl, 
    mediaType, 
    className = "" 
  }: { 
    mediaUrl?: string, 
    mediaType?: string, 
    className?: string 
  }) => {
    if (!mediaUrl) return null;
    
    return (
      mediaType === 'video' ? (
        <video 
          src={mediaUrl} 
          className={`absolute inset-0 w-full h-full object-cover ${className}`}
          controls
        />
      ) : (
        <img 
          src={mediaUrl} 
          alt="" 
          className={`absolute inset-0 w-full h-full object-cover ${className}`}
        />
      )
    );
  };

  // Component for the ad form (used in both create and edit modes)
  const AdFormComponent = ({ isEditing = false }) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ad Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Ad Name"
            value={adForm.name}
            onChange={(e) => setAdForm({ ...adForm, name: e.target.value })}
            placeholder="Enter ad name"
          />

          <div className="pt-2">
            <label className="block text-sm font-medium mb-2">Ad Type</label>
            <div className="flex space-x-4 mb-4">
              <div 
                className={`p-3 border rounded-md cursor-pointer flex-1 text-center ${adMode === 'custom' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}
                onClick={() => setAdMode('custom')}
              >
                <h3 className="font-medium text-sm">Custom Ad</h3>
              </div>
              <div 
                className={`p-3 border rounded-md cursor-pointer flex-1 text-center ${adMode === 'redirect' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}
                onClick={() => setAdMode('redirect')}
              >
                <h3 className="font-medium text-sm">Redirect Only</h3>
              </div>
            </div>
          </div>

          {adMode === 'custom' ? (
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Media
              </label>
              <ImageUpload
                onUpload={handleFileUpload}
                accept={['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']}
                maxSize={10485760} // 10MB
                preview={adForm.mediaUrl}
                className="mb-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Images (PNG, JPG, GIF) or Videos (MP4, MOV, WEBM)
              </p>
            </div>
          ) : (
            <Input
              label="Redirect URL"
              value={adForm.redirectUrl}
              onChange={(e) => setAdForm({ ...adForm, redirectUrl: e.target.value })}
              placeholder="Enter the URL where users will be redirected"
              leftIcon={<Link size={16} />}
            />
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSaveAd} 
            className="w-full" 
            leftIcon={<Save size={16} />}
            isLoading={isSaving || isUploading}
          >
            {isEditing ? 'Update Ad Design' : 'Save Ad Design'}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Preview component for ad design
  const AdPreview = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={previewRef}
            className="aspect-video rounded-lg p-8 relative overflow-hidden"
            style={{ backgroundColor: adMode === 'custom' ? adForm.background : '#FFFFFF' }}
          >
            {adMode === 'custom' && adForm.mediaUrl && (
              <MediaPreview 
                mediaUrl={adForm.mediaUrl} 
                mediaType={adForm.mediaType} 
              />
            )}
            <div className="relative z-10 flex items-center justify-center h-full">
              {adMode === 'custom' ? (
                !adForm.mediaUrl && (
                  <div className="text-center text-gray-400">
                    <div className="mb-2">
                      {adForm.mediaType === 'video' ? (
                        <Film size={40} className="mx-auto" />
                      ) : (
                        <ImageIcon size={40} className="mx-auto" />
                      )}
                    </div>
                    <p>Upload media to preview</p>
                  </div>
                )
              ) : (
                <p className="text-gray-700 bg-white bg-opacity-90 p-3 rounded shadow-sm">
                  {adForm.redirectUrl || 'Enter a redirect URL'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAdList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Ad Designs</h1>
        <Button onClick={() => setViewMode('create')} leftIcon={<Plus size={16} />}>
          Create New Ad
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading designs...</p>
        </div>
      ) : savedDesigns.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-600 mb-4">No ad designs yet. Create your first one!</p>
            <Button onClick={() => setViewMode('create')} leftIcon={<Plus size={16} />}>
              Create New Ad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedDesigns.map((design) => (
            <Card key={design.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{design.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="aspect-video rounded-md p-4 mb-4 relative overflow-hidden"
                  style={{ backgroundColor: design.background }}
                >
                  <MediaPreview 
                    mediaUrl={design.content.mediaUrl} 
                    mediaType={design.content.mediaType}
                  />
                  <div className="relative z-10 flex items-center justify-center h-full">
                    {design.content.mediaUrl ? (
                      <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 p-1 rounded-tl text-white text-xs">
                        {design.content.mediaType === 'video' ? 'Video' : 'Image'}
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-gray-700 bg-white bg-opacity-90 p-2 rounded">
                          {design.content.redirectUrl || design.ad_spaces?.content?.url || 'No redirect URL'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Created: {new Date(design.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedDesign(design);
                      setViewMode('detail');
                    }}
                    leftIcon={<Eye size={16} />}
                    size="sm"
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleEditAd(design)}
                    leftIcon={<Edit size={16} />}
                    size="sm"
                  >
                    Edit
                  </Button>
                </div>
                <Button 
                  variant="outline"
                  className="text-error-500 hover:bg-error-50"
                  onClick={() => handleDeleteAd(design.id)}
                  leftIcon={<Trash2 size={16} />}
                  size="sm"
                >
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderAdDetail = () => {
    if (!selectedDesign?.ad_spaces?.id) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">Ad space information not available</p>
          <Button 
            variant="outline" 
            onClick={() => setViewMode('list')} 
            className="mt-4"
          >
            Back to List
          </Button>
        </div>
      );
    }

    const qrUrl = generateQrUrl(selectedDesign.ad_spaces.id);
    const redirectUrl = selectedDesign.content.redirectUrl || selectedDesign.ad_spaces.content.url;
    const mediaUrl = selectedDesign.content.mediaUrl || selectedDesign.ad_spaces.content.mediaUrl;
    const mediaType = selectedDesign.content.mediaType || 'image';
    const isRedirectMode = !!redirectUrl && !mediaUrl;

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => setViewMode('list')}>
            Back to List
          </Button>
          <h1 className="text-2xl font-bold">{selectedDesign.name}</h1>
          <Button 
            variant="outline" 
            onClick={() => handleEditAd(selectedDesign)}
            leftIcon={<Edit size={16} />}
          >
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={previewRef}
                className="aspect-video rounded-lg p-8 relative overflow-hidden"
                style={{ backgroundColor: selectedDesign.background }}
              >
                <MediaPreview 
                  mediaUrl={mediaUrl} 
                  mediaType={mediaType}
                />
                <div className="relative z-10 flex items-center justify-center h-full">
                  {isRedirectMode && (
                    <div className="text-center">
                      <p className="text-gray-700 bg-white bg-opacity-90 p-3 rounded shadow-sm">
                        {redirectUrl || 'No redirect URL'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <QrCode
                  value={qrUrl}
                  size={200}
                  level="H"
                  includeMargin
                />
                <p className="mt-4 text-sm text-gray-600">
                  Scan this QR code to view the ad
                </p>
                <p className="mt-2 text-xs text-gray-500 break-all">
                  {qrUrl}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Name</h3>
                  <p>{selectedDesign.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <p>{new Date(selectedDesign.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Type</h3>
                  <p>{isRedirectMode ? 'Redirect Only' : 'Custom Media'}</p>
                </div>
                {mediaUrl && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Media Type</h3>
                    <p>{mediaType === 'video' ? 'Video' : 'Image'}</p>
                  </div>
                )}
                {isRedirectMode && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Redirect URL</h3>
                    <p className="mt-1 break-all">{redirectUrl || 'None'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderAdCreator = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => setViewMode('list')}>
          Back to List
        </Button>
        <h1 className="text-2xl font-bold">Create New Ad</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdFormComponent isEditing={false} />
        <AdPreview />
      </div>
    </div>
  );

  const renderAdEditor = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => setViewMode('list')}>
          Back to List
        </Button>
        <h1 className="text-2xl font-bold">Edit Ad Design</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdFormComponent isEditing={true} />
        <AdPreview />
      </div>
    </div>
  );

  return (
    <div>
      {viewMode === 'list' && renderAdList()}
      {viewMode === 'detail' && renderAdDetail()}
      {viewMode === 'create' && renderAdCreator()}
      {viewMode === 'edit' && renderAdEditor()}
    </div>
  );
};

export default AdBuilder;