import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import QrCode from '../../components/ui/QrCode';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye,
  Link,
  QrCode as QrIcon,
  Edit,
  Image,
  Type,
  PaintBucket,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdDesign {
  id: string;
  name: string;
  template: string;
  created_at: string;
  background: string;
  content: {
    headline?: string;
    subheadline?: string;
    redirectUrl?: string;
    showHeadline?: boolean;
    showSubheadline?: boolean;
    showBackground?: boolean;
  };
  image_url?: string;
  ad_space_id?: string;
  ad_spaces?: {
    id: string;
    title: string;
    content: {
      url?: string;
      headline?: string;
      subheadline?: string;
      showHeadline?: boolean;
      showSubheadline?: boolean;
      showBackground?: boolean;
    };
  } | null;
}

const AdBuilder = () => {
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail' | 'edit'>('list');
  const [selectedDesign, setSelectedDesign] = useState<AdDesign | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savedDesigns, setSavedDesigns] = useState<AdDesign[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [adMode, setAdMode] = useState<'custom' | 'redirect'>('custom');
  const [adForm, setAdForm] = useState({
    name: '',
    headline: '',
    subheadline: '',
    background: '#FFFFFF',
    redirectUrl: '',
    showHeadline: true,
    showSubheadline: true,
    showBackground: true
  });

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

  const handleSaveAd = async () => {
    if (!adForm.name) {
      toast.error('Please provide a name for your ad');
      return;
    }

    // Only validate redirect URL for redirect mode
    if (adMode === 'redirect' && !adForm.redirectUrl) {
      toast.error('Please provide a redirect URL');
      return;
    }

    // For custom mode, validate headline if it's enabled
    if (adMode === 'custom' && adForm.showHeadline && !adForm.headline) {
      toast.error('Please provide a headline or disable the headline section');
      return;
    }

    // For custom mode, validate subheadline if it's enabled
    if (adMode === 'custom' && adForm.showSubheadline && !adForm.subheadline) {
      toast.error('Please provide a subheadline or disable the subheadline section');
      return;
    }

    setIsSaving(true);

    try {
      if (selectedDesign && viewMode === 'edit') {
        // Update existing ad design and ad space
        const { data: adSpace, error: adSpaceError } = await supabase
          .from('ad_spaces')
          .update({
            title: adForm.name,
            description: adMode === 'custom' ? adForm.subheadline : `Ad space for ${adForm.name}`,
            content: adMode === 'custom' 
              ? {
                  headline: adForm.showHeadline ? adForm.headline : null,
                  subheadline: adForm.showSubheadline ? adForm.subheadline : null,
                  showHeadline: adForm.showHeadline,
                  showSubheadline: adForm.showSubheadline
                }
              : {
                  url: adForm.redirectUrl
                },
            theme: {
              backgroundColor: adForm.showBackground ? adForm.background : null,
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
            content: adMode === 'custom'
              ? {
                  headline: adForm.showHeadline ? adForm.headline : null,
                  subheadline: adForm.showSubheadline ? adForm.subheadline : null,
                  showHeadline: adForm.showHeadline,
                  showSubheadline: adForm.showSubheadline,
                  showBackground: adForm.showBackground
                }
              : {
                  redirectUrl: adForm.redirectUrl
                }
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
            description: adMode === 'custom' ? adForm.subheadline : `Ad space for ${adForm.name}`,
            content: adMode === 'custom' 
              ? {
                  headline: adForm.showHeadline ? adForm.headline : null,
                  subheadline: adForm.showSubheadline ? adForm.subheadline : null,
                  showHeadline: adForm.showHeadline,
                  showSubheadline: adForm.showSubheadline
                }
              : {
                  url: adForm.redirectUrl
                },
            theme: {
              backgroundColor: adForm.showBackground ? adForm.background : null,
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
            content: adMode === 'custom'
              ? {
                  headline: adForm.showHeadline ? adForm.headline : null,
                  subheadline: adForm.showSubheadline ? adForm.subheadline : null,
                  showHeadline: adForm.showHeadline,
                  showSubheadline: adForm.showSubheadline,
                  showBackground: adForm.showBackground
                }
              : {
                  redirectUrl: adForm.redirectUrl
                },
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
      setAdForm({
        name: '',
        headline: '',
        subheadline: '',
        background: '#FFFFFF',
        redirectUrl: '',
        showHeadline: true,
        showSubheadline: true,
        showBackground: true
      });
      setAdMode('custom');
      setSelectedDesign(null);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save design');
    } finally {
      setIsSaving(false);
    }
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
    const isRedirectMode = !design.content.headline && 
      (design.content.redirectUrl || design.ad_spaces?.content?.url);
    
    setAdMode(isRedirectMode ? 'redirect' : 'custom');
    
    // Extract toggle states from design content or set defaults
    const showHeadline = design.content.showHeadline !== undefined 
      ? design.content.showHeadline 
      : !!design.content.headline;
      
    const showSubheadline = design.content.showSubheadline !== undefined 
      ? design.content.showSubheadline 
      : !!design.content.subheadline;
      
    const showBackground = design.content.showBackground !== undefined 
      ? design.content.showBackground 
      : true;
    
    // Populate the form with the design data
    setAdForm({
      name: design.name,
      headline: design.content.headline || '',
      subheadline: design.content.subheadline || '',
      background: design.background || '#FFFFFF',
      redirectUrl: design.content.redirectUrl || design.ad_spaces?.content?.url || '',
      showHeadline,
      showSubheadline,
      showBackground
    });
    
    setViewMode('edit');
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
                  style={{ 
                    backgroundColor: design.content.showBackground !== false ? design.background : 'transparent' 
                  }}
                >
                  {design.image_url && (
                    <img 
                      src={design.image_url} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-center h-full">
                    {design.content.headline && design.content.showHeadline !== false ? (
                      <div className="text-center">
                        <h3 className="text-lg font-bold mb-2 text-white\" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                          {design.content.headline}
                        </h3>
                        {design.content.subheadline && design.content.showSubheadline !== false && (
                          <p className="text-sm text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            {design.content.subheadline}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-white bg-black bg-opacity-30 p-2 rounded">
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
    const isRedirectMode = !!redirectUrl && !selectedDesign.content.headline;
    
    // Check if elements should be shown
    const showHeadline = selectedDesign.content.showHeadline !== false;
    const showSubheadline = selectedDesign.content.showSubheadline !== false;
    const showBackground = selectedDesign.content.showBackground !== false;

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
                style={{ 
                  backgroundColor: showBackground ? selectedDesign.background : 'transparent' 
                }}
              >
                {selectedDesign.image_url && (
                  <img 
                    src={selectedDesign.image_url} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="relative z-10 flex items-center justify-center h-full">
                  {isRedirectMode ? (
                    <div className="text-center">
                      <p className="text-white bg-black bg-opacity-30 p-3 rounded">
                        {redirectUrl || 'No redirect URL'}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      {showHeadline && selectedDesign.content.headline && (
                        <h2 className="text-3xl font-bold mb-4 text-white\" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                          {selectedDesign.content.headline}
                        </h2>
                      )}
                      {showSubheadline && selectedDesign.content.subheadline && (
                        <p className="text-xl text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                          {selectedDesign.content.subheadline}
                        </p>
                      )}
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
                {showBackground && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Background Color</h3>
                    <div className="flex items-center mt-1">
                      <div 
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: selectedDesign.background }}
                      />
                      <span className="ml-2">{selectedDesign.background}</span>
                    </div>
                  </div>
                )}
                <div>
                  {isRedirectMode ? (
                    <>
                      <h3 className="text-sm font-medium text-gray-500">Redirect URL</h3>
                      <p className="mt-1 break-all">{redirectUrl || 'None'}</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-sm font-medium text-gray-500">Content</h3>
                      <div className="mt-2 space-y-2">
                        {showHeadline && selectedDesign.content.headline && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-sm font-medium">Headline</p>
                            <p className="mt-1">{selectedDesign.content.headline}</p>
                          </div>
                        )}
                        {showSubheadline && selectedDesign.content.subheadline && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-sm font-medium">Subheadline</p>
                            <p className="mt-1">{selectedDesign.content.subheadline}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
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
              <>
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Type size={18} className="text-gray-500 mr-2" />
                      <span className="font-medium">Headline</span>
                    </div>
                    <button
                      type="button"
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                      onClick={() => setAdForm({ ...adForm, showHeadline: !adForm.showHeadline })}
                    >
                      {adForm.showHeadline ? (
                        <>
                          <ToggleRight size={20} className="text-primary-500 mr-1" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={20} className="text-gray-400 mr-1" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {adForm.showHeadline && (
                    <Input
                      value={adForm.headline}
                      onChange={(e) => setAdForm({ ...adForm, headline: e.target.value })}
                      placeholder="Enter headline text"
                    />
                  )}
                </div>

                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Type size={18} className="text-gray-500 mr-2" />
                      <span className="font-medium">Subheadline</span>
                    </div>
                    <button
                      type="button"
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                      onClick={() => setAdForm({ ...adForm, showSubheadline: !adForm.showSubheadline })}
                    >
                      {adForm.showSubheadline ? (
                        <>
                          <ToggleRight size={20} className="text-primary-500 mr-1" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={20} className="text-gray-400 mr-1" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {adForm.showSubheadline && (
                    <Input
                      value={adForm.subheadline}
                      onChange={(e) => setAdForm({ ...adForm, subheadline: e.target.value })}
                      placeholder="Enter subheadline text"
                    />
                  )}
                </div>
              </>
            ) : (
              <Input
                label="Redirect URL"
                value={adForm.redirectUrl}
                onChange={(e) => setAdForm({ ...adForm, redirectUrl: e.target.value })}
                placeholder="Enter the URL where users will be redirected"
                leftIcon={<Link size={16} />}
              />
            )}

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <PaintBucket size={18} className="text-gray-500 mr-2" />
                  <span className="font-medium">Background Color</span>
                </div>
                <button
                  type="button"
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                  onClick={() => setAdForm({ ...adForm, showBackground: !adForm.showBackground })}
                >
                  {adForm.showBackground ? (
                    <>
                      <ToggleRight size={20} className="text-primary-500 mr-1" />
                      <span>Enabled</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={20} className="text-gray-400 mr-1" />
                      <span>Disabled</span>
                    </>
                  )}
                </button>
              </div>
              
              {adForm.showBackground && (
                <input
                  type="color"
                  value={adForm.background}
                  onChange={(e) => setAdForm({ ...adForm, background: e.target.value })}
                  className="w-full h-10 rounded-md cursor-pointer"
                />
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSaveAd} 
              className="w-full" 
              leftIcon={<Save size={16} />}
              isLoading={isSaving}
            >
              Save Ad Design
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={previewRef}
              className="aspect-video rounded-lg p-8 relative"
              style={{ 
                backgroundColor: adForm.showBackground ? adForm.background : 'transparent',
                border: !adForm.showBackground ? '1px dashed #ccc' : 'none'
              }}
            >
              <div className="text-center">
                {adMode === 'custom' ? (
                  <>
                    {adForm.showHeadline && (
                      <h2 className="text-3xl font-bold mb-4 text-white\" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {adForm.headline || 'Your Headline Here'}
                      </h2>
                    )}
                    {adForm.showSubheadline && (
                      <p className="text-xl text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {adForm.subheadline || 'Your subheadline text will appear here'}
                      </p>
                    )}
                    {!adForm.showHeadline && !adForm.showSubheadline && (
                      <p className="text-gray-500 italic">No text elements enabled</p>
                    )}
                  </>
                ) : (
                  <p className="text-white bg-black bg-opacity-30 p-3 rounded">
                    {adForm.redirectUrl || 'Enter a redirect URL'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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
              <>
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Type size={18} className="text-gray-500 mr-2" />
                      <span className="font-medium">Headline</span>
                    </div>
                    <button
                      type="button"
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                      onClick={() => setAdForm({ ...adForm, showHeadline: !adForm.showHeadline })}
                    >
                      {adForm.showHeadline ? (
                        <>
                          <ToggleRight size={20} className="text-primary-500 mr-1" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={20} className="text-gray-400 mr-1" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {adForm.showHeadline && (
                    <Input
                      value={adForm.headline}
                      onChange={(e) => setAdForm({ ...adForm, headline: e.target.value })}
                      placeholder="Enter headline text"
                    />
                  )}
                </div>

                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Type size={18} className="text-gray-500 mr-2" />
                      <span className="font-medium">Subheadline</span>
                    </div>
                    <button
                      type="button"
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                      onClick={() => setAdForm({ ...adForm, showSubheadline: !adForm.showSubheadline })}
                    >
                      {adForm.showSubheadline ? (
                        <>
                          <ToggleRight size={20} className="text-primary-500 mr-1" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={20} className="text-gray-400 mr-1" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {adForm.showSubheadline && (
                    <Input
                      value={adForm.subheadline}
                      onChange={(e) => setAdForm({ ...adForm, subheadline: e.target.value })}
                      placeholder="Enter subheadline text"
                    />
                  )}
                </div>
              </>
            ) : (
              <Input
                label="Redirect URL"
                value={adForm.redirectUrl}
                onChange={(e) => setAdForm({ ...adForm, redirectUrl: e.target.value })}
                placeholder="Enter the URL where users will be redirected"
                leftIcon={<Link size={16} />}
              />
            )}

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <PaintBucket size={18} className="text-gray-500 mr-2" />
                  <span className="font-medium">Background Color</span>
                </div>
                <button
                  type="button"
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                  onClick={() => setAdForm({ ...adForm, showBackground: !adForm.showBackground })}
                >
                  {adForm.showBackground ? (
                    <>
                      <ToggleRight size={20} className="text-primary-500 mr-1" />
                      <span>Enabled</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={20} className="text-gray-400 mr-1" />
                      <span>Disabled</span>
                    </>
                  )}
                </button>
              </div>
              
              {adForm.showBackground && (
                <input
                  type="color"
                  value={adForm.background}
                  onChange={(e) => setAdForm({ ...adForm, background: e.target.value })}
                  className="w-full h-10 rounded-md cursor-pointer"
                />
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSaveAd} 
              className="w-full" 
              leftIcon={<Save size={16} />}
              isLoading={isSaving}
            >
              Update Ad Design
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={previewRef}
              className="aspect-video rounded-lg p-8 relative"
              style={{ 
                backgroundColor: adForm.showBackground ? adForm.background : 'transparent',
                border: !adForm.showBackground ? '1px dashed #ccc' : 'none'
              }}
            >
              <div className="text-center">
                {adMode === 'custom' ? (
                  <>
                    {adForm.showHeadline && (
                      <h2 className="text-3xl font-bold mb-4 text-white\" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {adForm.headline || 'Your Headline Here'}
                      </h2>
                    )}
                    {adForm.showSubheadline && (
                      <p className="text-xl text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {adForm.subheadline || 'Your subheadline text will appear here'}
                      </p>
                    )}
                    {!adForm.showHeadline && !adForm.showSubheadline && (
                      <p className="text-gray-500 italic">No text elements enabled</p>
                    )}
                  </>
                ) : (
                  <p className="text-white bg-black bg-opacity-30 p-3 rounded">
                    {adForm.redirectUrl || 'Enter a redirect URL'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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